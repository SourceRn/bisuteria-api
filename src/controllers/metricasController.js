import { pool } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /metricas?dias=30
// "dias" define que tan viejo debe ser el ultimo contacto para considerar
// a un cliente "sin interaccion reciente". Default: 30 dias.
export const obtenerMetricas = asyncHandler(async (req, res) => {
  const dias = Number(req.query.dias) > 0 ? Number(req.query.dias) : 30;

  const [
    totalClientesResult,
    porEstadoResult,
    interaccionesPorClienteResult,
    sinInteraccionRecienteResult,
  ] = await Promise.all([
    // Total de clientes
    pool.query("select count(*)::int as total from clientes"),

    // Clientes activos vs inactivos
    pool.query(
      `select estado, count(*)::int as total
       from clientes
       group by estado`
    ),

    // Numero de interacciones por cliente
    pool.query(
      `select c.id as cliente_id, c.nombre, count(i.id)::int as total_interacciones
       from clientes c
       left join interacciones i on i.cliente_id = c.id
       group by c.id, c.nombre
       order by total_interacciones desc`
    ),

    // Clientes sin interaccion en los ultimos N dias (o nunca han tenido una)
    pool.query(
      `select c.id, c.nombre, c.correo, c.etapa_crm,
              (select max(fecha) from interacciones i where i.cliente_id = c.id) as ultima_interaccion
       from clientes c
       where not exists (
         select 1 from interacciones i
         where i.cliente_id = c.id
           and i.fecha >= now() - ($1 || ' days')::interval
       )
       order by ultima_interaccion asc nulls first`,
      [dias]
    ),
  ]);

  // Normaliza activos/inactivos a un objeto simple, con 0 explicito si no hay filas de algun estado
  const porEstado = { activo: 0, inactivo: 0 };
  porEstadoResult.rows.forEach((row) => {
    porEstado[row.estado] = row.total;
  });

  res.json({
    total_clientes: totalClientesResult.rows[0].total,
    clientes_activos: porEstado.activo,
    clientes_inactivos: porEstado.inactivo,
    interacciones_por_cliente: interaccionesPorClienteResult.rows,
    clientes_sin_interaccion_reciente: {
      dias_umbral: dias,
      total: sinInteraccionRecienteResult.rows.length,
      clientes: sinInteraccionRecienteResult.rows,
    },
  });
});