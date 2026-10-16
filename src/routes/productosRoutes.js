import { Router } from "express";
import {
  crearProducto,
  listarProductos,
  obtenerProducto,
  actualizarProducto,
  actualizarEstrategiaProducto,
  eliminarProducto,
  obtenerCatalogoPublico,
  verificarStock,
} from "../controllers/productosController.js";
import { listarMovimientosDeProducto } from "../controllers/movimientosController.js";
import { requireAuth, requireAdmin, requireRol } from "../middleware/auth.js";
import { limiteLecturaPublica } from "../middleware/rateLimiter.js";

const router = Router();

// PUBLICAS: el storefront
router.get("/catalogo", limiteLecturaPublica, obtenerCatalogoPublico);
router.post("/verificar-stock", limiteLecturaPublica, verificarStock);

router.use(requireAuth);

router.get("/", requireRol("ventas", "logistica"), listarProductos);
router.post("/", requireRol("logistica"), crearProducto);
router.get("/:id/movimientos", requireRol("logistica"), listarMovimientosDeProducto);
router.put("/:id/estrategia", requireRol("logistica"), actualizarEstrategiaProducto);
router.get("/:id", requireRol("ventas", "logistica"), obtenerProducto);
router.put("/:id", requireRol("logistica"), actualizarProducto);
router.delete("/:id", requireAdmin, eliminarProducto);

export default router;