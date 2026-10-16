import { Router } from "express";
import { obtenerMetricas } from "../controllers/metricasController.js";
import { requireAuth, requireRol } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireRol("ventas"));
router.get("/", obtenerMetricas);

export default router;