import { pool } from "../config/db.js";
import { asyncHandler } from "../middleware/errorHandler.js";

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