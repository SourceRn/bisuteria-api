import { pool } from "../config/db.js";
import { crearProveedorSchema, actualizarProveedorSchema } from "../validators/proveedorSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// POST /proveedores
export const crearProveedor = asyncHandler(async (req, res) => {
  const d = crearProveedorSchema.parse(req.body);

  const { rows } = await pool.query(
    `insert into proveedores (nombre, contacto, correo, telefono)
     values ($1, $2, $3, $4)
     returning *`,
    [d.nombre, d.contacto || null, d.correo || null, d.telefono || null]
  );

  res.status(201).json(rows[0]);
});

// GET /proveedores?buscar=texto
export const listarProveedores = asyncHandler(async (req, res) => {
  const { buscar } = req.query;

  const condiciones = [];
  const valores = [];

  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`nombre ilike $${valores.length}`);
  }

  const whereClause = condiciones.length ? `where ${condiciones.join(" and ")}` : "";

  const { rows } = await pool.query(
    `select * from proveedores ${whereClause} order by nombre asc`,
    valores
  );

  res.json(rows);
});

// GET /proveedores/:id
export const obtenerProveedor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query("select * from proveedores where id = $1", [id]);

  if (rows.length === 0) throw new ApiError(404, "Proveedor no encontrado");
  res.json(rows[0]);
});

// PUT /proveedores/:id
export const actualizarProveedor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const datos = actualizarProveedorSchema.parse(req.body);

  const campos = Object.keys(datos);
  if (campos.length === 0) throw new ApiError(400, "No se enviaron campos para actualizar");

  const asignaciones = campos.map((campo, i) => `${campo} = $${i + 1}`).join(", ");
  const valores = campos.map((campo) => datos[campo]);
  valores.push(id);

  const { rows } = await pool.query(
    `update proveedores set ${asignaciones} where id = $${valores.length} returning *`,
    valores
  );

  if (rows.length === 0) throw new ApiError(404, "Proveedor no encontrado");
  res.json(rows[0]);
});

// DELETE /proveedores/:id
export const eliminarProveedor = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query("delete from proveedores where id = $1 returning id", [id]);

  if (rows.length === 0) throw new ApiError(404, "Proveedor no encontrado");
  res.status(204).send();
});