import { Router } from "express";
import { obtenerNivelScm, actualizarNivelScm } from "../controllers/scmNivelController.js";
import { obtenerReportesScm } from "../controllers/reportesScmController.js";
import { obtenerNotificacionesScm } from "../controllers/notificacionesScmController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/estado", obtenerNivelScm);
router.put("/nivel", requireAdmin, actualizarNivelScm);
router.get("/reportes", obtenerReportesScm);
router.get("/notificaciones", obtenerNotificacionesScm);

export default router;