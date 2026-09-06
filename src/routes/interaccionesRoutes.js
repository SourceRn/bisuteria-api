import { Router } from "express";
import { crearInteraccion } from "../controllers/interaccionesController.js";
import { limitePublico } from "../middleware/rateLimiter.js";

const router = Router();

// PUBLICA: el checkout del storefront registra el pedido como interaccion, sin login
router.post("/", limitePublico, crearInteraccion);

export default router;