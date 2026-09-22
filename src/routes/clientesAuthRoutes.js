import { Router } from "express";
import { vincularCuenta, obtenerMiPerfil, obtenerMisPedidos } from "../controllers/clientesAuthController.js";
import { requireClienteAuth } from "../middleware/clienteAuth.js";
import { limitePublico } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/vincular-cuenta", limitePublico, vincularCuenta);
router.get("/me", requireClienteAuth, obtenerMiPerfil);
router.get("/me/pedidos", requireClienteAuth, obtenerMisPedidos);

export default router;