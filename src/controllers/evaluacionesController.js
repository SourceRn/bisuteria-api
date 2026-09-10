import { pool } from "../config/db.js";
import { generarSnapshot } from "../services/evaluacionesService.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// GET /evaluaciones?tipo=semanal&limite=12
export const listarEvaluaciones = asyncHandler(async (req, res) => {
  const { tipo, limite } = req.query;

  const condiciones = [];
  const valores = [];

  if (tipo) {
    valores.push(tipo);
    condiciones.push(`tipo_evaluacion = $${valores.length}`);
  }

  const whereClause = condiciones.length ? `where ${condiciones.join(" and ")}` : "";
  const limiteFinal = Number(limite) > 0 ? Number(limite) : 24;

  const { rows } = await pool.query(
    `select * from evaluaciones ${whereClause} order by fecha desc limit ${limiteFinal}`,
    valores
  );

  // El campo "notas" viene como JSON en texto, lo parseamos para que el frontend
  // lo reciba ya como objeto en vez de string.
  const resultado = rows.map((r) => ({
    ...r,
    notas: r.notas ? JSON.parse(r.notas) : null,
  }));

  res.json(resultado.reverse()); // orden cronologico ascendente, mejor para graficar tendencias
});

// POST /evaluaciones/snapshot-prueba  — SOLO para verificar manualmente que el snapshot funciona.
// El flujo real es automatico via cron (ver src/jobs/snapshotJobs.js); este endpoint
// existe unicamente para pruebas de desarrollo y requiere rol admin.
export const generarSnapshotDePrueba = asyncHandler(async (req, res) => {
  const { tipo } = req.body;

  if (!["semanal", "mensual"].includes(tipo)) {
    throw new ApiError(400, "tipo debe ser 'semanal' o 'mensual'");
  }

  const snapshot = await generarSnapshot(tipo);
  res.status(201).json(snapshot);
});