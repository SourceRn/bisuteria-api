import { Router } from "express";
import { listarPedidos, obtenerResumenPedidos } from "../controllers/pedidosController.js";
import { requireAuth, requireRol } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireRol("ventas"));
router.get("/", listarPedidos);
router.get("/resumen", obtenerResumenPedidos);

export default router;