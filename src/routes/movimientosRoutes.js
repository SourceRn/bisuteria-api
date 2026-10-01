import { Router } from "express";
import { crearMovimiento, registrarVentaPublica } from "../controllers/movimientosController.js";
import { requireAuth } from "../middleware/auth.js";
import { limitePublico } from "../middleware/rateLimiter.js";

const router = Router();

// PUBLICA: el checkout del storefront descuenta stock al confirmar un pedido
router.post("/venta-publica", limitePublico, registrarVentaPublica);

router.use(requireAuth);
router.post("/movimiento", crearMovimiento);

export default router;