import { supabase } from "../config/supabase.js";
import { pool } from "../config/db.js";
import { ApiError, asyncHandler } from "./errorHandler.js";

// Verifica el token de un COMPRADOR del storefront (distinto de requireAuth,
// que es para el staff del CRM/SCM). Busca en "clientes", no en "usuarios".
export const requireClienteAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Debes iniciar sesión");
  }

  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new ApiError(401, "Sesión inválida o expirada");
  }

  const { rows } = await pool.query("select * from clientes where auth_id = $1", [data.user.id]);

  if (rows.length === 0) {
    throw new ApiError(403, "Esta cuenta no está vinculada a ningún cliente");
  }

  req.cliente = rows[0];
  next();
});