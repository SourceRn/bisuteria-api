import { pool } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /pedidos?cliente_id=...&desde=...&hasta=...
// Un "pedido" es una interaccion con tipo = 'Pedido'. Este endpoint las junta
// con la info del cliente para presentarlas como su propio modulo en el CRM.
export const listarPedidos = asyncHandler(async (req, res) => {
  const { cliente_id, desde, hasta } = req.query;

  const condiciones = ["i.tipo = 'Pedido'"];
  const valores = [];

  if (cliente_id) {
    valores.push(cliente_id);
    condiciones.push(`i.cliente_id = $${valores.length}`);
  }
  if (desde) {
    valores.push(desde);
    condiciones.push(`i.fecha >= $${valores.length}`);
  }
  if (hasta) {
    valores.push(hasta);
    condiciones.push(`i.fecha <= $${valores.length}`);
  }

  const { rows } = await pool.query(
    `select i.id, i.descripcion, i.fecha,
            c.id as cliente_id, c.nombre as cliente_nombre, c.correo as cliente_correo
     from interacciones i
     join clientes c on c.id = i.cliente_id
     where ${condiciones.join(" and ")}
     order by i.fecha desc`,
    valores
  );

  res.json(rows);
});

// GET /pedidos/resumen — totales rapidos para encabezar la vista
export const obtenerResumenPedidos = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `select count(*)::int as total_pedidos,
            count(distinct cliente_id)::int as clientes_con_pedido,
            (select count(*)::int from interacciones
             where tipo = 'Pedido' and fecha >= now() - interval '30 days') as pedidos_ultimos_30_dias
     from interacciones
     where tipo = 'Pedido'`
  );

  res.json(rows[0]);
});