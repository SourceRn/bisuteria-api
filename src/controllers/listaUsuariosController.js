import { pool } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /usuarios — lista simple para poblar selects (ej. "responsable" de una interaccion)
export const listarUsuarios = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    "select id, nombre, correo, rol from usuarios order by nombre asc"
  );
  res.json(rows);
});