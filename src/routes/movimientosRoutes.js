import { Router } from "express";
import { crearMovimiento } from "../controllers/movimientosController.js";
import { requireAuth, requireRol } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/movimiento", requireRol("logistica"), crearMovimiento);

export default router;