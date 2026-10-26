import { Router } from "express";
import {
  obtenerUsuarioActual,
  obtenerMiActividad,
  obtenerMiRol,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
  cambiarRolUsuario,
  eliminarUsuario,
} from "../controllers/usuariosController.js";
import { listarUsuarios } from "../controllers/listaUsuariosController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", listarUsuarios);
router.get("/me", obtenerUsuarioActual);
router.get("/me/actividad", obtenerMiActividad);
router.get("/rol", obtenerMiRol);
router.get("/roles", requireAdmin, listarRoles);

router.post("/", requireAdmin, crearUsuario);
router.put("/:id/rol", requireAdmin, cambiarRolUsuario);
router.put("/:id", requireAdmin, actualizarUsuario);
router.delete("/:id", requireAdmin, eliminarUsuario);

export default router;