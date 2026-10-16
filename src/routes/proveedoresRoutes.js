import { Router } from "express";
import {
  crearProveedor,
  listarProveedores,
  obtenerProveedor,
  actualizarProveedor,
  eliminarProveedor,
} from "../controllers/proveedoresController.js";
import { requireAuth, requireAdmin, requireRol } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireRol("logistica"));
router.post("/", crearProveedor);
router.get("/", listarProveedores);
router.get("/:id", obtenerProveedor);
router.put("/:id", actualizarProveedor);
router.delete("/:id", requireAdmin, eliminarProveedor);

export default router;