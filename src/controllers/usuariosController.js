import { pool } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { crearUsuarioSchema, actualizarUsuarioSchema } from "../validators/usuarioAdminSchema.js";
import { ApiError } from "../middleware/errorHandler.js";
import { ETIQUETAS_ROL, MODULOS_POR_ROL } from "../config/permisos.js";
import { cambiarRolSchema } from "../validators/usuarioAdminSchema.js";

// GET /usuarios/me — requireAuth ya dejo el registro completo en req.usuario
export const obtenerUsuarioActual = asyncHandler(async (req, res) => {
  res.json(req.usuario);
});

// GET /usuarios/me/actividad?desde=2026-01-01&hasta=2026-01-31
export const obtenerMiActividad = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;

  const condiciones = ["i.usuario_id = $1"];
  const valores = [req.usuario.id];

  if (desde) {
    valores.push(desde);
    condiciones.push(`i.fecha >= $${valores.length}`);
  }
  if (hasta) {
    valores.push(hasta);
    condiciones.push(`i.fecha <= $${valores.length}`);
  }

  const { rows } = await pool.query(
    `select i.id, i.tipo, i.descripcion, i.fecha,
            c.id as cliente_id, c.nombre as cliente_nombre
     from interacciones i
     join clientes c on c.id = i.cliente_id
     where ${condiciones.join(" and ")}
     order by i.fecha desc`,
    valores
  );

  res.json(rows);
});

// POST /usuarios  (solo admin)
export const crearUsuario = asyncHandler(async (req, res) => {
  const datos = crearUsuarioSchema.parse(req.body);

  // 1. Crea la cuenta en Supabase Auth (requiere la Secret key)
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: datos.correo,
    password: datos.password,
    email_confirm: true, // se salta la verificacion por correo
  });

  if (error) {
    throw new ApiError(400, `No se pudo crear la cuenta: ${error.message}`);
  }

  // 2. Inserta el registro correspondiente en nuestra propia tabla usuarios
  try {
    const { rows } = await pool.query(
      `insert into usuarios (nombre, correo, rol, auth_id, activo)
       values ($1, $2, coalesce($3, 'ventas'), $4, true)
       returning *`,
      [datos.nombre, datos.correo, datos.rol, data.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // Si falla guardar en nuestra tabla, deshacemos la cuenta de Auth para no dejar huerfanos
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    throw err;
  }
});

// PUT /usuarios/:id  (solo admin) — edita nombre/rol, o activa/desactiva
export const actualizarUsuario = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const datos = actualizarUsuarioSchema.parse(req.body);

  if (id === req.usuario.id) {
    throw new ApiError(400, "No puedes modificar tu propio rol o estado desde aqui");
  }

  const campos = Object.keys(datos);
  if (campos.length === 0) throw new ApiError(400, "No se enviaron campos para actualizar");

  const asignaciones = campos.map((campo, i) => `${campo} = $${i + 1}`).join(", ");
  const valores = campos.map((campo) => datos[campo]);
  valores.push(id);

  const { rows } = await pool.query(
    `update usuarios set ${asignaciones} where id = $${valores.length} returning *`,
    valores
  );

  if (rows.length === 0) throw new ApiError(404, "Usuario no encontrado");
  res.json(rows[0]);
});

// DELETE /usuarios/:id  (solo admin) — elimina cuenta por completo (Auth + tabla)
export const eliminarUsuario = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.usuario.id) {
    throw new ApiError(400, "No puedes eliminar tu propia cuenta");
  }

  const { rows } = await pool.query("select auth_id from usuarios where id = $1", [id]);
  if (rows.length === 0) throw new ApiError(404, "Usuario no encontrado");

  const authId = rows[0].auth_id;

  await pool.query("delete from usuarios where id = $1", [id]);

  if (authId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authId);
    if (error) {
      console.error("[usuarios] Se borro de la tabla pero fallo borrar de Auth:", error.message);
    }
  }

  res.status(204).send();
});

// GET /usuarios/rol — rol del usuario actual y modulos que puede ver (menu dinamico)
export const obtenerMiRol = asyncHandler(async (req, res) => {
  const { rol } = req.usuario;
  res.json({ rol, etiqueta: ETIQUETAS_ROL[rol], modulos: MODULOS_POR_ROL[rol] || [] });
});

// PUT /usuarios/:id/rol (solo admin)
export const cambiarRolUsuario = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rol } = cambiarRolSchema.parse(req.body);

  if (id === req.usuario.id) {
    throw new ApiError(400, "No puedes cambiar tu propio rol");
  }

  const { rows } = await pool.query(
    "update usuarios set rol = $1 where id = $2 returning id, nombre, correo, rol, activo",
    [rol, id]
  );
  if (rows.length === 0) throw new ApiError(404, "Usuario no encontrado");

  res.json(rows[0]);
});

// GET /usuarios/roles — roles y los modulos de cada uno (solo admin)
export const listarRoles = asyncHandler(async (req, res) => {
  const roles = Object.keys(MODULOS_POR_ROL).map((rol) => ({
    rol,
    etiqueta: ETIQUETAS_ROL[rol],
    modulos: MODULOS_POR_ROL[rol],
  }));
  res.json(roles);
});