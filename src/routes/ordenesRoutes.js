import { Router } from "express";
import {
  crearOrdenPendiente,
  procesarOrdenEndpoint,
  procesarOrdenPublica,
  listarOrdenes,
  obtenerOrden,
  actualizarEstadoOrden,
} from "../controllers/ordenesController.js";
import { requireAuth, requireRol } from "../middleware/auth.js";
import { limitePublico } from "../middleware/rateLimiter.js";

const router = Router();

// PUBLICA: el checkout del storefront procesa la venta completa (con limite de peticiones)
router.post("/procesar-publica", limitePublico, procesarOrdenPublica);

router.use(requireAuth);

// admin pasa siempre; ventas y logistica pueden consultar, solo ventas crea y cambia estados
router.get("/", requireRol("ventas", "logistica"), listarOrdenes);
router.post("/", requireRol("ventas"), crearOrdenPendiente);
router.post("/procesar", requireRol("ventas"), procesarOrdenEndpoint);
router.get("/:id", requireRol("ventas", "logistica"), obtenerOrden);
router.put("/:id/estado", requireRol("ventas"), actualizarEstadoOrden);

export default router;