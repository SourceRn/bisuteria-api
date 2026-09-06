import { Router } from "express";
import { obtenerMetricas } from "../controllers/metricasController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", obtenerMetricas);

export default router;