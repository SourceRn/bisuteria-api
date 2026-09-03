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

const router = Router();

// El orden importa: rutas mas especificas (/etapa, /interacciones) antes que las genericas (/:id)
router.post("/", crearCliente);
router.get("/", listarClientes);
router.get("/:id/interacciones", listarInteraccionesDeCliente);
router.get("/:id", obtenerCliente);
router.put("/:id/etapa", actualizarEtapaCliente);
router.put("/:id", actualizarCliente);
router.delete("/:id", eliminarCliente);

export default router;