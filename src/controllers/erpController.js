import { pool } from "../config/db.js";
import { actualizarEstadoErpSchema } from "../validators/erpEstadoSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// Agrega el porcentaje de avance del checklist (para la barra de progreso)
function conAvance(estado) {
  const checklist = Array.isArray(estado.checklist) ? estado.checklist : [];
  const hechos = checklist.filter((i) => i.completado).length;
  return { ...estado, avance: checklist.length ? Math.round((hechos / checklist.length) * 100) : 0 };
}

// GET /erp/estado
export const obtenerEstadoErp = asyncHandler(async (req, res) => {
  const { rows } = await pool.query("select * from erp_estado order by actualizado desc limit 1");
  if (rows.length === 0) throw new ApiError(404, "No hay registro de estado ERP configurado");
  res.json(conAvance(rows[0]));
});

// PUT /erp/estado
export const actualizarEstadoErp = asyncHandler(async (req, res) => {
  const datos = actualizarEstadoErpSchema.parse(req.body);

  const campos = Object.keys(datos);
  if (campos.length === 0) throw new ApiError(400, "No se enviaron campos para actualizar");

  const actual = await pool.query("select id from erp_estado order by actualizado desc limit 1");
  if (actual.rows.length === 0) throw new ApiError(404, "No hay registro de estado ERP configurado");

  // Los nombres de columna salen de las llaves ya validadas por Zod (lista cerrada)
  const asignaciones = campos.map((campo, i) =>
    campo === "checklist" ? `checklist = $${i + 1}::jsonb` : `${campo} = $${i + 1}`
  );
  asignaciones.push("actualizado = now()");

  const valores = campos.map((campo) => (campo === "checklist" ? JSON.stringify(datos[campo]) : datos[campo]));
  valores.push(actual.rows[0].id);

  const { rows } = await pool.query(
    `update erp_estado set ${asignaciones.join(", ")} where id = $${valores.length} returning *`,
    valores
  );

  res.json(conAvance(rows[0]));
});

// GET /erp/metricas — KPIs del dashboard empresarial, integrando CRM + SCM + ERP
export const obtenerMetricasErp = asyncHandler(async (req, res) => {
  const [ventas, vendidos, clientes, inventario, porMes, masVendidos, recientes, proveedores] = await Promise.all([
    pool.query(
      `select coalesce(sum(total), 0)::float as ventas_totales,
              count(*)::int as ordenes_procesadas,
              (select count(*)::int from ordenes where estado = 'pendiente') as ordenes_pendientes,
              (select count(*)::int from ordenes where estado = 'cancelada') as ordenes_canceladas
       from ordenes
       where estado = 'procesada'`
    ),
    pool.query(
      `select coalesce(sum(oi.cantidad), 0)::int as productos_vendidos
       from orden_items oi
       join ordenes o on o.id = oi.orden_id
       where o.estado = 'procesada'`
    ),
    // CRM
    pool.query(
      `select count(*)::int as clientes_activos,
              (select count(*)::int from clientes) as clientes_totales
       from clientes
       where estado = 'activo'`
    ),
    // SCM
    pool.query(
      `select coalesce(sum(stock_actual), 0)::int as unidades,
              count(*)::int as productos,
              (count(*) filter (where stock_actual > stock_minimo))::int as productos_saludables,
              (count(*) filter (where stock_actual <= stock_minimo))::int as productos_stock_bajo
       from productos`
    ),
    pool.query(
      `select to_char(m.mes, 'YYYY-MM') as mes,
              coalesce(sum(o.total), 0)::float as total,
              count(o.id)::int as ordenes
       from generate_series(
              date_trunc('month', now()) - interval '5 months',
              date_trunc('month', now()),
              interval '1 month'
            ) as m(mes)
       left join ordenes o on date_trunc('month', o.fecha) = m.mes and o.estado = 'procesada'
       group by m.mes
       order by m.mes`
    ),
    pool.query(
      `select p.id, p.nombre, sum(oi.cantidad)::int as total_vendido
       from orden_items oi
       join ordenes o on o.id = oi.orden_id and o.estado = 'procesada'
       join productos p on p.id = oi.producto_id
       group by p.id, p.nombre
       order by total_vendido desc
       limit 5`
    ),
    pool.query(
      `select o.id,
              ('OR-' || lpad(o.folio::text, greatest(3, length(o.folio::text)), '0')) as folio_texto,
              o.estado, o.total::float as total, o.fecha, c.nombre as cliente_nombre
       from ordenes o
       join clientes c on c.id = o.cliente_id
       order by o.fecha desc
       limit 6`
    ),
    // Ordenes a proveedores (SCM): no se repiten, se integran en el reporte
    pool.query(
      `select count(*)::int as pedidos_proveedor_pendientes
       from pedidos_scm
       where estado in ('pendiente', 'en_proceso')`
    ),
  ]);

  const inv = inventario.rows[0];

  res.json({
    ...ventas.rows[0],
    ...vendidos.rows[0],
    ...clientes.rows[0],
    inventario: {
      ...inv,
      porcentaje_saludable: inv.productos > 0 ? Math.round((inv.productos_saludables / inv.productos) * 100) : 0,
    },
    ventas_por_mes: porMes.rows,
    productos_mas_vendidos: masVendidos.rows,
    ordenes_recientes: recientes.rows,
    scm: proveedores.rows[0],
  });
});