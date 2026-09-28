import { pool } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /scm/reportes
export const obtenerReportesScm = asyncHandler(async (req, res) => {
  const [masVendidosResult, rotacionLentaResult, inventarioCriticoResult, resumenResult] = await Promise.all([
    // Productos mas vendidos: suma de salidas con motivo 'venta'
    pool.query(
      `select p.id, p.nombre, coalesce(sum(m.cantidad), 0)::int as total_vendido
       from productos p
       left join inventario_movimientos m
         on m.producto_id = p.id and m.tipo = 'salida' and m.motivo = 'venta'
       group by p.id, p.nombre
       order by total_vendido desc
       limit 10`
    ),

    // Rotacion lenta: productos con stock alto y poca o ninguna salida
    pool.query(
      `select p.id, p.nombre, p.stock_actual, coalesce(sum(m.cantidad), 0)::int as total_salidas
       from productos p
       left join inventario_movimientos m
         on m.producto_id = p.id and m.tipo = 'salida'
       group by p.id, p.nombre, p.stock_actual
       having coalesce(sum(m.cantidad), 0) < p.stock_actual * 0.2
       order by total_salidas asc, p.stock_actual desc
       limit 10`
    ),

    // Inventario critico: stock en el minimo o por debajo
    pool.query(
      `select id, nombre, stock_actual, stock_minimo, estrategia_logistica
       from productos
       where stock_actual <= stock_minimo
       order by (stock_actual - stock_minimo) asc`
    ),

    // Resumen general para encabezar el dashboard
    pool.query(
      `select
         (select count(*)::int from productos) as total_productos,
         (select count(*)::int from proveedores) as total_proveedores,
         (select count(*)::int from pedidos_scm where estado in ('pendiente', 'en_proceso')) as pedidos_en_proceso,
         (select count(*)::int from productos where stock_actual <= stock_minimo) as productos_stock_bajo`
    ),
  ]);

  res.json({
    resumen: resumenResult.rows[0],
    productos_mas_vendidos: masVendidosResult.rows,
    rotacion_lenta: rotacionLentaResult.rows,
    inventario_critico: inventarioCriticoResult.rows,
  });
});