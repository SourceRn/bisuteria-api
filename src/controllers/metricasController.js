import { calcularMetricas } from "../services/metricasService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /metricas?dias=30
export const obtenerMetricas = asyncHandler(async (req, res) => {
  const dias = Number(req.query.dias) > 0 ? Number(req.query.dias) : 30;
  const metricas = await calcularMetricas(dias);
  res.json(metricas);
});