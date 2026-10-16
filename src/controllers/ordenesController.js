import { pool } from "../config/db.js";
import { crearOrdenSchema, procesarOrdenSchema, actualizarEstadoOrdenSchema } from "../validators/ordenSchema.js";
import { crearOrden, procesarOrden, crearYProcesarOrden, cancelarOrden } from "../services/ordenesService.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// Abre transaccion, ejecuta, confirma; si algo falla, revierte todo.
async function enTransaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// lpad con greatest() para que el folio nunca se trunque pasando de 999 ordenes
const FOLIO_SQL = "('OR-' || lpad(o.folio::text, greatest(3, length(o.folio::text)), '0'))";

const SELECT_ORDENES = `
  select o.id, o.folio, ${FOLIO_SQL} as folio_texto,
         o.estado, o.origen, o.total::float as total, o.fecha,
         c.id as cliente_id, c.nombre as cliente_nombre, c.correo as cliente_correo,
         c.telefono as cliente_telefono, c.empresa as cliente_empresa,
         u.nombre as usuario_nombre,
         (select coalesce(sum(cantidad), 0)::int from orden_items where orden_id = o.id) as unidades
  from ordenes o
  join clientes c on c.id = o.cliente_id
  left join usuarios u on u.id = o.usuario_id`;

// POST /ordenes — crea la orden en "pendiente", sin tocar inventario
export const crearOrdenPendiente = asyncHandler(async (req, res) => {
  const datos = crearOrdenSchema.parse(req.body);
  const orden = await enTransaccion((client) =>
    crearOrden(client, { ...datos, usuario_id: req.usuario.id, origen: "erp" })
  );
  res.status(201).json(orden);
});

// POST /ordenes/procesar — procesa una pendiente (orden_id) o crea y procesa (cliente_id + items)
export const procesarOrdenEndpoint = asyncHandler(async (req, res) => {
  const datos = procesarOrdenSchema.parse(req.body);

  const resultado = await enTransaccion((client) =>
    datos.orden_id
      ? procesarOrden(client, { orden_id: datos.orden_id, usuario_id: req.usuario.id })
      : crearYProcesarOrden(client, {
          cliente_id: datos.cliente_id,
          items: datos.items,
          usuario_id: req.usuario.id,
          origen: "erp",
        })
  );

  res.status(201).json(resultado);
});

// POST /ordenes/procesar-publica — PUBLICA: la venta del checkout del storefront.
// Solo acepta cliente + productos; nunca procesa ordenes existentes.
export const procesarOrdenPublica = asyncHandler(async (req, res) => {
  const datos = crearOrdenSchema.parse(req.body);

  const resultado = await enTransaccion((client) =>
    crearYProcesarOrden(client, { ...datos, usuario_id: null, origen: "storefront" })
  );

  const { id, folio_texto, total, estado, fecha } = resultado.orden;
  res.status(201).json({ orden: { id, folio_texto, total: Number(total), estado, fecha }, pasos: resultado.pasos });
});

// GET /ordenes?estado=&cliente_id=&buscar=&desde=&hasta=
export const listarOrdenes = asyncHandler(async (req, res) => {
  const { estado, cliente_id, buscar, desde, hasta } = req.query;

  const condiciones = [];
  const valores = [];

  if (estado) {
    valores.push(estado);
    condiciones.push(`o.estado = $${valores.length}`);
  }
  if (cliente_id) {
    valores.push(cliente_id);
    condiciones.push(`o.cliente_id = $${valores.length}`);
  }
  if (desde) {
    valores.push(desde);
    condiciones.push(`o.fecha >= $${valores.length}`);
  }
  if (hasta) {
    valores.push(hasta);
    condiciones.push(`o.fecha <= $${valores.length}`);
  }
  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`(c.nombre ilike $${valores.length} or ${FOLIO_SQL} ilike $${valores.length})`);
  }

  const whereClause = condiciones.length ? `where ${condiciones.join(" and ")}` : "";

  const { rows } = await pool.query(
    `${SELECT_ORDENES} ${whereClause} order by o.fecha desc limit 200`,
    valores
  );

  res.json(rows);
});

// GET /ordenes/:id — orden + productos + bitacora de procesos
export const obtenerOrden = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ordenRes = await pool.query(`${SELECT_ORDENES} where o.id = $1`, [id]);
  if (ordenRes.rows.length === 0) throw new ApiError(404, "Orden no encontrada");

  const [itemsRes, procesosRes] = await Promise.all([
    pool.query(
      `select oi.producto_id, p.nombre, p.imagen_url, oi.cantidad,
              oi.precio_unitario::float as precio_unitario, oi.subtotal::float as subtotal
       from orden_items oi
       join productos p on p.id = oi.producto_id
       where oi.orden_id = $1
       order by p.nombre asc`,
      [id]
    ),
    pool.query(
      `select paso, descripcion, estado, fecha
       from procesos_internos
       where orden_id = $1
       order by fecha asc`,
      [id]
    ),
  ]);

  res.json({ ...ordenRes.rows[0], items: itemsRes.rows, procesos: procesosRes.rows });
});

// PUT /ordenes/:id/estado — "procesada" (si estaba pendiente) o "cancelada"
export const actualizarEstadoOrden = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estado } = actualizarEstadoOrdenSchema.parse(req.body);

  const resultado = await enTransaccion(async (client) => {
    const ordenRes = await client.query("select * from ordenes where id = $1 for update", [id]);
    if (ordenRes.rows.length === 0) throw new ApiError(404, "Orden no encontrada");
    const orden = ordenRes.rows[0];

    return estado === "procesada"
      ? procesarOrden(client, { orden_id: id, usuario_id: req.usuario.id })
      : cancelarOrden(client, orden, req.usuario.id);
  });

  res.json(resultado);
});