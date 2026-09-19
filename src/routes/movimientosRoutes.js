import { Router } from "express";
import { crearMovimiento } from "../controllers/movimientosController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/movimiento", crearMovimiento);

export default router;