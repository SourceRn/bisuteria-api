import { pool } from "../config/db.js";
import { crearPedidoScmSchema, actualizarEstadoPedidoScmSchema } from "../validators/pedidoScmSchema.js";
import { registrarMovimiento } from "./movimientosController.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// POST /pedidos-scm  — creacion manual. Es el camino que usan los productos PULL
// ("reposicion solo bajo pedido"), pero tambien sirve para registrar pedidos
// de tipo "venta" o reposiciones manuales de un producto PUSH si hiciera falta.
export const crearPedidoScm = asyncHandler(async (req, res) => {
  const datos = crearPedidoScmSchema.parse(req.body);

  const productoExiste = await pool.query("select id from productos where id = $1", [datos.producto_id]);
  if (productoExiste.rows.length === 0) {
    throw new ApiError(404, "El producto indicado no existe");
  }

  const { rows } = await pool.query(
    `insert into pedidos_scm (producto_id, proveedor_id, usuario_id, cantidad, tipo, notas)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [datos.producto_id, datos.proveedor_id || null, req.usuario.id, datos.cantidad, datos.tipo, datos.notas || null]
  );

  res.status(201).json(rows[0]);
});

// GET /pedidos-scm?producto_id=...&estado=...&tipo=...
export const listarPedidosScm = asyncHandler(async (req, res) => {
  const { producto_id, estado, tipo } = req.query;

  const condiciones = [];
  const valores = [];

  if (producto_id) {
    valores.push(producto_id);
    condiciones.push(`p.producto_id = $${valores.length}`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`p.estado = $${valores.length}`);
  }
  if (tipo) {
    valores.push(tipo);
    condiciones.push(`p.tipo = $${valores.length}`);
  }

  const whereClause = condiciones.length ? `where ${condiciones.join(" and ")}` : "";

  const { rows } = await pool.query(
    `select p.*, pr.nombre as producto_nombre, prov.nombre as proveedor_nombre, u.nombre as usuario_nombre
     from pedidos_scm p
     join productos pr on pr.id = p.producto_id
     left join proveedores prov on prov.id = p.proveedor_id
     left join usuarios u on u.id = p.usuario_id
     ${whereClause}
     order by p.fecha desc`,
    valores
  );

  res.json(rows);
});

// PUT /pedidos-scm/:id/estado
// Cuando un pedido de reposicion pasa a "surtido", ademas de cambiar su estado,
// se genera automaticamente el movimiento de ENTRADA correspondiente — asi el
// inventario refleja de inmediato que la mercancia ya llego.
export const actualizarEstadoPedidoScm = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estado } = actualizarEstadoPedidoScmSchema.parse(req.body);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pedidoResult = await client.query("select * from pedidos_scm where id = $1 for update", [id]);
    if (pedidoResult.rows.length === 0) {
      throw new ApiError(404, "Pedido no encontrado");
    }
    const pedido = pedidoResult.rows[0];

    const yaEstabaSurtido = pedido.estado === "surtido";

    const actualizado = await client.query(
      "update pedidos_scm set estado = $1 where id = $2 returning *",
      [estado, id]
    );

    // Solo genera el movimiento de entrada la PRIMERA vez que se marca "surtido",
    // para no duplicar stock si alguien cambia el estado varias veces.
    if (estado === "surtido" && !yaEstabaSurtido && pedido.tipo === "reposicion") {
      await registrarMovimiento(client, {
        producto_id: pedido.producto_id,
        usuario_id: req.usuario.id,
        tipo: "entrada",
        cantidad: pedido.cantidad,
        motivo: "reposicion",
      });
    }

    await client.query("COMMIT");
    res.json(actualizado.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});