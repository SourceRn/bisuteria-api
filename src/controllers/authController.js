import { pool } from "../config/db.js";
import { supabaseLogin } from "../config/supabase.js";
import { loginSchema } from "../validators/authSchema.js";
import { ETIQUETAS_ROL, MODULOS_POR_ROL } from "../config/permisos.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// POST /auth/login
// Valida las credenciales con Supabase Auth y ademas que la persona exista en
// "usuarios" y este activa. Un cliente del storefront tiene cuenta en Supabase,
// pero no fila en "usuarios", asi que aqui recibe 403.
export const login = asyncHandler(async (req, res) => {
  const { correo, password } = loginSchema.parse(req.body);

  const { data, error } = await supabaseLogin.auth.signInWithPassword({ email: correo, password });
  if (error || !data.session) {
    throw new ApiError(401, "Correo o contraseña incorrectos");
  }

  const { rows } = await pool.query(
    "select id, nombre, correo, rol, activo from usuarios where auth_id = $1",
    [data.user.id]
  );
  if (rows.length === 0) throw new ApiError(403, "Este usuario no tiene acceso al sistema");

  const usuario = rows[0];
  if (!usuario.activo) {
    throw new ApiError(403, "Tu cuenta ha sido desactivada. Contacta a un administrador.");
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    usuario,
    etiqueta_rol: ETIQUETAS_ROL[usuario.rol],
    modulos: MODULOS_POR_ROL[usuario.rol] || [],
  });
});