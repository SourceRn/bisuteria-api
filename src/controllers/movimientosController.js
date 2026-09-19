import { pool } from "../config/db.js";
import { crearMovimientoSchema } from "../validators/movimientoSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// POST /inventario/movimiento
export const crearMovimiento = asyncHandler(async (req, res) => {
  const datos = crearMovimientoSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productoResult = await client.query(
      "select id, stock_actual from productos where id = $1 for update",
      [datos.producto_id]
    );

    if (productoResult.rows.length === 0) {
      throw new ApiError(404, "El producto indicado no existe");
    }

    const stockActual = productoResult.rows[0].stock_actual;
    const delta = datos.tipo === "entrada" ? datos.cantidad : -datos.cantidad;
    const nuevoStock = stockActual + delta;

    if (nuevoStock < 0) {
      throw new ApiError(400, `Stock insuficiente. Stock actual: ${stockActual}, se intento restar: ${datos.cantidad}`);
    }

    const movimientoResult = await client.query(
      `insert into inventario_movimientos (producto_id, usuario_id, tipo, cantidad, motivo)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [datos.producto_id, datos.usuario_id || null, datos.tipo, datos.cantidad, datos.motivo]
    );

    await client.query(
      "update productos set stock_actual = $1 where id = $2",
      [nuevoStock, datos.producto_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      movimiento: movimientoResult.rows[0],
      stock_anterior: stockActual,
      stock_nuevo: nuevoStock,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// GET /productos/:id/movimientos
export const listarMovimientosDeProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const productoExiste = await pool.query("select id from productos where id = $1", [id]);
  if (productoExiste.rows.length === 0) {
    throw new ApiError(404, "Producto no encontrado");
  }

  const { rows } = await pool.query(
    `select m.*, u.nombre as usuario_nombre
     from inventario_movimientos m
     left join usuarios u on u.id = m.usuario_id
     where m.producto_id = $1
     order by m.fecha desc`,
    [id]
  );

  res.json(rows);
});