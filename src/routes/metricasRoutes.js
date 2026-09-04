import { Router } from "express";
import { obtenerMetricas } from "../controllers/metricasController.js";

const router = Router();

router.get("/", obtenerMetricas);

export default router;