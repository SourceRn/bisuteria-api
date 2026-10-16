import { Router } from "express";
import { crearMovimiento, registrarVentaPublica } from "../controllers/movimientosController.js";
import { requireAuth, requireRol } from "../middleware/auth.js";
import { limitePublico } from "../middleware/rateLimiter.js";

const router = Router();

// PUBLICA: el checkout actual del storefront (se retira en el Dia 5)
router.post("/venta-publica", limitePublico, registrarVentaPublica);

router.use(requireAuth);
router.post("/movimiento", requireRol("logistica"), crearMovimiento);

export default router;