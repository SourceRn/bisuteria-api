import { Router } from "express";
import { obtenerUsuarioActual, obtenerMiActividad } from "../controllers/usuariosController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/me", obtenerUsuarioActual);
router.get("/me/actividad", obtenerMiActividad);

export default router;