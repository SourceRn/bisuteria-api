import { Router } from "express";
import { crearInteraccion } from "../controllers/interaccionesController.js";

const router = Router();

router.post("/", crearInteraccion);

export default router;