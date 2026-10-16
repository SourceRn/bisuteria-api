import { Router } from "express";
import { crearPedidoScm, listarPedidosScm, actualizarEstadoPedidoScm } from "../controllers/pedidosScmController.js";
import { requireAuth, requireRol } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireRol("logistica"));
router.post("/", crearPedidoScm);
router.get("/", listarPedidosScm);
router.put("/:id/estado", actualizarEstadoPedidoScm);

export default router;