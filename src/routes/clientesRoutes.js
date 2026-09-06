import { Router } from "express";
import {
  crearCliente,
  listarClientes,
  obtenerCliente,
  actualizarCliente,
  actualizarEtapaCliente,
  eliminarCliente,
} from "../controllers/clientesController.js";
import { listarInteraccionesDeCliente } from "../controllers/interaccionesController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { limitePublico } from "../middleware/rateLimiter.js";

const router = Router();

// PUBLICA: el checkout del storefront crea clientes sin login (con limite de peticiones)
router.post("/", limitePublico, crearCliente);

// A partir de aqui, todo requiere sesion activa (uso interno del CRM)
router.use(requireAuth);

router.get("/", listarClientes);
router.get("/:id/interacciones", listarInteraccionesDeCliente);
router.get("/:id", obtenerCliente);
router.put("/:id/etapa", actualizarEtapaCliente);
router.put("/:id", actualizarCliente);
router.delete("/:id", requireAdmin, eliminarCliente); // solo admin puede eliminar

export default router;