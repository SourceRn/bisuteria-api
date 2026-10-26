import { Router } from "express";
import { crearInteraccion } from "../controllers/interaccionesController.js";
import { requireAuth, requireRol } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireRol("ventas"));
router.post("/", crearInteraccion);

export default router;