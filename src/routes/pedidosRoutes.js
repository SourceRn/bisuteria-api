import { Router } from "express";
import { listarPedidos, obtenerResumenPedidos } from "../controllers/pedidosController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listarPedidos);
router.get("/resumen", obtenerResumenPedidos);

export default router;