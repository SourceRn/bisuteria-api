import { pool } from "../config/db.js";
import { crearInteraccionSchema } from "../validators/interaccionSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// POST /interacciones
export const crearInteraccion = asyncHandler(async (req, res) => {
  const datos = crearInteraccionSchema.parse(req.body);

  const clienteExiste = await pool.query("select id from clientes where id = $1", [datos.cliente_id]);
  if (clienteExiste.rows.length === 0) {
    throw new ApiError(404, "El cliente indicado no existe");
  }

  const { rows } = await pool.query(
    `insert into interacciones (cliente_id, usuario_id, tipo, descripcion, fecha)
     values ($1, $2, $3, $4, coalesce($5, now()))
     returning *`,
    [datos.cliente_id, datos.usuario_id || null, datos.tipo, datos.descripcion || null, datos.fecha || null]
  );

  res.status(201).json(rows[0]);
});

// GET /clientes/:id/interacciones
export const listarInteraccionesDeCliente = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const clienteExiste = await pool.query("select id from clientes where id = $1", [id]);
  if (clienteExiste.rows.length === 0) {
    throw new ApiError(404, "Cliente no encontrado");
  }

  const { rows } = await pool.query(
    "select * from interacciones where cliente_id = $1 order by fecha desc",
    [id]
  );

  res.json(rows);
});