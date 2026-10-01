import { pool } from "../config/db.js";
import { crearMovimientoSchema } from "../validators/movimientoSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// Logica central, reutilizable: aplica un movimiento de inventario dentro de
// una transaccion ya abierta (recibe el "client", no usa pool directo).
// La usan tanto POST /inventario/movimiento como el flujo de "pedido surtido".
export async function registrarMovimiento(client, { producto_id, usuario_id, tipo, cantidad, motivo }) {
  const productoResult = await client.query(
    "select id, stock_actual, stock_minimo, estrategia_logistica, proveedor_id from productos where id = $1 for update",
    [producto_id]
  );

  if (productoResult.rows.length === 0) {
    throw new ApiError(404, "El producto indicado no existe");
  }

  const producto = productoResult.rows[0];
  const delta = tipo === "entrada" ? cantidad : -cantidad;
  const nuevoStock = producto.stock_actual + delta;

  if (nuevoStock < 0) {
    throw new ApiError(400, `Stock insuficiente. Stock actual: ${producto.stock_actual}, se intento restar: ${cantidad}`);
  }

  const movimientoResult = await client.query(
    `insert into inventario_movimientos (producto_id, usuario_id, tipo, cantidad, motivo)
     values ($1, $2, $3, $4, $5)
     returning *`,
    [producto_id, usuario_id || null, tipo, cantidad, motivo]
  );

  await client.query("update productos set stock_actual = $1 where id = $2", [nuevoStock, producto_id]);

  return {
    movimiento: movimientoResult.rows[0],
    stockAnterior: producto.stock_actual,
    stockNuevo: nuevoStock,
    producto,
  };
}

// Revisa si, tras un movimiento, un producto PUSH quedo en su stock minimo o por
// debajo, y si no tiene ya un pedido de reposicion pendiente, genera uno automatico.
async function generarPedidoPushSiAplica(client, producto, stockNuevo) {
  if (producto.estrategia_logistica !== "PUSH") return null;
  if (stockNuevo > producto.stock_minimo) return null;

  const pendienteResult = await client.query(
    `select id from pedidos_scm
     where producto_id = $1 and tipo = 'reposicion' and estado in ('pendiente', 'en_proceso')
     limit 1`,
    [producto.id]
  );
  if (pendienteResult.rows.length > 0) return null; // ya hay uno en curso, no duplicar

  // Cantidad sugerida: repone hasta el doble del minimo, como colchon de seguridad.
  const cantidadSugerida = Math.max(producto.stock_minimo * 2 - stockNuevo, producto.stock_minimo);

  const { rows } = await client.query(
    `insert into pedidos_scm (producto_id, proveedor_id, cantidad, tipo, estado, notas)
     values ($1, $2, $3, 'reposicion', 'pendiente', 'Generado automaticamente por estrategia PUSH')
     returning *`,
    [producto.id, producto.proveedor_id, cantidadSugerida]
  );

  return rows[0];
}

// POST /inventario/movimiento
export const crearMovimiento = asyncHandler(async (req, res) => {
  const datos = crearMovimientoSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { movimiento, stockAnterior, stockNuevo, producto } = await registrarMovimiento(client, {
      ...datos,
      usuario_id: datos.usuario_id || req.usuario?.id,
    });

    const pedidoGenerado = await generarPedidoPushSiAplica(client, producto, stockNuevo);

    await client.query("COMMIT");

    res.status(201).json({
      movimiento,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      pedido_generado: pedidoGenerado, // null si no aplico, o el pedido si se auto-genero
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

// POST /inventario/venta-publica — PUBLICA, pensada para que el checkout del
// storefront descuente stock al confirmar un pedido. Solo acepta "salida"
// con motivo "venta", nunca otro tipo/motivo, para no abrir una puerta trasera
// hacia ajustes de inventario arbitrarios sin autenticacion.
export const registrarVentaPublica = asyncHandler(async (req, res) => {
  const { producto_id, cantidad } = req.body;

  if (!producto_id || !cantidad || cantidad <= 0) {
    throw new ApiError(400, "producto_id y cantidad (positiva) son requeridos");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { producto, stockNuevo } = await registrarMovimiento(client, {
      producto_id,
      usuario_id: null, // venta publica, sin usuario de staff asociado
      tipo: "salida",
      cantidad,
      motivo: "venta",
    });

    const pedidoGenerado = await generarPedidoPushSiAplica(client, producto, stockNuevo);

    await client.query("COMMIT");
    res.status(201).json({ ok: true, pedido_generado: pedidoGenerado });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});