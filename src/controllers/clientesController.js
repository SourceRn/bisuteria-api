import { pool } from "../config/db.js";
import { crearClienteSchema, actualizarClienteSchema, actualizarEtapaSchema } from "../validators/clienteSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// POST /clientes
export const crearCliente = asyncHandler(async (req, res) => {
  const datos = crearClienteSchema.parse(req.body); // lanza ZodError si es invalido -> lo captura errorHandler

  const { rows } = await pool.query(
    `insert into clientes (nombre, correo, telefono, empresa, estado, etapa_crm)
     values ($1, $2, $3, $4, coalesce($5, 'activo'), coalesce($6, 'Prospecto'))
     returning *`,
    [datos.nombre, datos.correo, datos.telefono || null, datos.empresa || null, datos.estado, datos.etapa_crm]
  );

  res.status(201).json(rows[0]);
});

// GET /clientes?buscar=texto&estado=activo&etapa=Prospecto
export const listarClientes = asyncHandler(async (req, res) => {
  const { buscar, estado, etapa } = req.query;

  const condiciones = [];
  const valores = [];

  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`(nombre ilike $${valores.length} or correo ilike $${valores.length})`);
  }
  if (estado) {
    valores.push(estado);
    condiciones.push(`estado = $${valores.length}`);
  }
  if (etapa) {
    valores.push(etapa);
    condiciones.push(`etapa_crm = $${valores.length}`);
  }

  const whereClause = condiciones.length ? `where ${condiciones.join(" and ")}` : "";

  const { rows } = await pool.query(
    `select * from clientes ${whereClause} order by fecha_registro desc`,
    valores
  );

  res.json(rows);
});

// GET /clientes/:id
export const obtenerCliente = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query("select * from clientes where id = $1", [id]);

  if (rows.length === 0) {
    throw new ApiError(404, "Cliente no encontrado");
  }

  res.json(rows[0]);
});

// PUT /clientes/:id
export const actualizarCliente = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const datos = actualizarClienteSchema.parse(req.body);

  const campos = Object.keys(datos);
  if (campos.length === 0) {
    throw new ApiError(400, "No se enviaron campos para actualizar");
  }

  // Arma el UPDATE dinamicamente solo con los campos que llegaron
  const asignaciones = campos.map((campo, i) => `${campo} = $${i + 1}`).join(", ");
  const valores = campos.map((campo) => datos[campo]);
  valores.push(id);

  const { rows } = await pool.query(
    `update clientes set ${asignaciones} where id = $${valores.length} returning *`,
    valores
  );

  if (rows.length === 0) {
    throw new ApiError(404, "Cliente no encontrado");
  }

  res.json(rows[0]);
});

// PUT /clientes/:id/etapa
export const actualizarEtapaCliente = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { etapa_crm } = actualizarEtapaSchema.parse(req.body);

  const { rows } = await pool.query(
    "update clientes set etapa_crm = $1 where id = $2 returning *",
    [etapa_crm, id]
  );

  if (rows.length === 0) {
    throw new ApiError(404, "Cliente no encontrado");
  }

  res.json(rows[0]);
});

// DELETE /clientes/:id
export const eliminarCliente = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query("delete from clientes where id = $1 returning id", [id]);

  if (rows.length === 0) {
    throw new ApiError(404, "Cliente no encontrado");
  }

  res.status(204).send();
});
