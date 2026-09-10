import { Router } from "express";
import { listarEvaluaciones, generarSnapshotDePrueba } from "../controllers/evaluacionesController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listarEvaluaciones);
router.post("/snapshot-prueba", requireAdmin, generarSnapshotDePrueba);

export default router;