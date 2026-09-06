import { supabase } from "../config/supabase.js";
import { pool } from "../config/db.js";
import { ApiError, asyncHandler } from "./errorHandler.js";

// Verifica el token Bearer del header Authorization y adjunta el usuario a req.usuario
export const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Falta el token de autenticacion");
  }

  const token = authHeader.split(" ")[1];

  // Le pregunta a Supabase Auth si el token es valido y a quien pertenece
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiError(401, "Token invalido o expirado");
  }

  // Busca el usuario correspondiente en NUESTRA tabla usuarios (para saber su rol)
  const { rows } = await pool.query(
    "select * from usuarios where auth_id = $1",
    [data.user.id]
  );

  if (rows.length === 0) {
    throw new ApiError(403, "Este usuario no tiene acceso al CRM");
  }

  req.usuario = rows[0]; // { id, nombre, correo, rol, auth_id, ... }
  next();
});

// Middleware adicional: solo deja pasar si el usuario es admin
export function requireAdmin(req, res, next) {
  if (req.usuario?.rol !== "admin") {
    throw new ApiError(403, "Se requiere rol de administrador");
  }
  next();
}