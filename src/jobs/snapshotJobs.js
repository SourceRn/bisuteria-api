import cron from "node-cron";
import { generarSnapshot } from "../services/evaluacionesService.js";

export function iniciarJobsDeSnapshot() {
  // Todos los lunes a medianoche
  cron.schedule("0 0 * * 1", async () => {
    try {
      await generarSnapshot("semanal");
    } catch (err) {
      console.error("[cron] Error generando snapshot semanal:", err.message);
    }
  });

  // El dia 1 de cada mes a medianoche
  cron.schedule("0 0 1 * *", async () => {
    try {
      await generarSnapshot("mensual");
    } catch (err) {
      console.error("[cron] Error generando snapshot mensual:", err.message);
    }
  });

  console.log("[cron] Jobs de snapshot programados (semanal: lunes, mensual: dia 1)");
}