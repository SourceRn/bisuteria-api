import { Router } from "express";
import { listarEvaluaciones, generarSnapshotDePrueba } from "../controllers/evaluacionesController.js";
import { requireAuth, requireAdmin, requireRol } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireRol("ventas"));
router.get("/", listarEvaluaciones);
router.post("/snapshot-prueba", requireAdmin, generarSnapshotDePrueba);

export default router;