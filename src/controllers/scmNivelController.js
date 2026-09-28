import { pool } from "../config/db.js";
import { actualizarNivelSchema } from "../validators/scmNivelSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// GET /scm/estado
export const obtenerNivelScm = asyncHandler(async (req, res) => {
  const { rows } = await pool.query("select * from scm_nivel order by actualizado desc limit 1");

  if (rows.length === 0) {
    throw new ApiError(404, "No hay registro de nivel SCM configurado");
  }

  res.json(rows[0]);
});

// PUT /scm/nivel
export const actualizarNivelScm = asyncHandler(async (req, res) => {
  const datos = actualizarNivelSchema.parse(req.body);

  const campos = Object.keys(datos);
  if (campos.length === 0) throw new ApiError(400, "No se enviaron campos para actualizar");

  const actual = await pool.query("select id from scm_nivel order by actualizado desc limit 1");
  if (actual.rows.length === 0) throw new ApiError(404, "No hay registro de nivel SCM configurado");

  const asignaciones = campos.map((campo, i) => {
    // checklist es jsonb, necesita casteo explicito al armar el UPDATE
    return campo === "checklist" ? `checklist = $${i + 1}::jsonb` : `${campo} = $${i + 1}`;
  });
  asignaciones.push(`actualizado = now()`);

  const valores = campos.map((campo) =>
    campo === "checklist" ? JSON.stringify(datos[campo]) : datos[campo]
  );
  valores.push(actual.rows[0].id);

  const { rows } = await pool.query(
    `update scm_nivel set ${asignaciones.join(", ")} where id = $${valores.length} returning *`,
    valores
  );

  res.json(rows[0]);
});