import { Router } from "express";
import { obtenerEstadoErp, actualizarEstadoErp, obtenerMetricasErp } from "../controllers/erpController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/estado", obtenerEstadoErp);
router.put("/estado", requireAdmin, actualizarEstadoErp);
router.get("/metricas", obtenerMetricasErp);

export default router;