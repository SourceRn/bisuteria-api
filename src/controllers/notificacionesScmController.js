import { pool } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /scm/notificaciones
// Las notificaciones se DERIVAN del estado actual (no hay tabla propia):
// cuando el problema se resuelve, la notificacion desaparece sola.
export const obtenerNotificacionesScm = asyncHandler(async (req, res) => {
  const [stockCritico, pedidosPorAtender, reposicionesAutomaticas] = await Promise.all([
    pool.query(
      `select id, nombre, stock_actual, stock_minimo, estrategia_logistica
       from productos
       where stock_actual <= stock_minimo
       order by (stock_actual - stock_minimo) asc`
    ),

    // "automatico": los pedidos generados por la logica PUSH no tienen usuario_id
    pool.query(
      `select p.id, p.cantidad, p.tipo, p.estado, p.fecha,
              (p.usuario_id is null) as automatico,
              pr.nombre as producto_nombre
       from pedidos_scm p
       join productos pr on pr.id = p.producto_id
       where p.estado in ('pendiente', 'en_proceso')
       order by p.fecha desc`
    ),

    // Eventos PUSH recientes ya resueltos (los pendientes ya salen en "por atender")
    pool.query(
      `select p.id, p.cantidad, p.estado, p.fecha, pr.nombre as producto_nombre
       from pedidos_scm p
       join productos pr on pr.id = p.producto_id
       where p.usuario_id is null
         and p.tipo = 'reposicion'
         and p.estado in ('surtido', 'cancelado')
         and p.fecha >= now() - interval '7 days'
       order by p.fecha desc
       limit 10`
    ),
  ]);

  res.json({
    total: stockCritico.rows.length + pedidosPorAtender.rows.length,
    stock_critico: stockCritico.rows,
    pedidos_por_atender: pedidosPorAtender.rows,
    reposiciones_automaticas: reposicionesAutomaticas.rows,
  });
});