import { Router } from "express";
import {
  crearProducto,
  listarProductos,
  obtenerProducto,
  actualizarProducto,
  actualizarEstrategiaProducto,
  eliminarProducto,
} from "../controllers/productosController.js";
import { listarMovimientosDeProducto } from "../controllers/movimientosController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", crearProducto);
router.get("/", listarProductos);
router.get("/:id/movimientos", listarMovimientosDeProducto);
router.put("/:id/estrategia", actualizarEstrategiaProducto);
router.get("/:id", obtenerProducto);
router.put("/:id", actualizarProducto);
router.delete("/:id", requireAdmin, eliminarProducto);

export default router;