import { pool } from "../config/db.js";
import { calcularMetricas } from "./metricasService.js";

const TIPOS_SNAPSHOT = ["semanal", "mensual"];

export async function generarSnapshot(tipo) {
  if (!TIPOS_SNAPSHOT.includes(tipo)) {
    throw new Error(`tipo de snapshot invalido: ${tipo}`);
  }

  const metricas = await calcularMetricas();

  // Guardamos solo el resumen (numeros), no los arreglos completos de clientes,
  // para no inflar la tabla con datos que ya cambian con el tiempo.
  const resumen = {
    total_clientes: metricas.total_clientes,
    clientes_activos: metricas.clientes_activos,
    clientes_inactivos: metricas.clientes_inactivos,
    total_interacciones: metricas.total_interacciones,
    clientes_sin_interaccion_reciente: metricas.clientes_sin_interaccion_reciente.total,
  };

  const { rows } = await pool.query(
    `insert into evaluaciones (tipo_evaluacion, valor, notas)
     values ($1, $2, $3)
     returning *`,
    [tipo, metricas.total_clientes, JSON.stringify(resumen)]
  );

  console.log(`[evaluaciones] Snapshot "${tipo}" generado:`, resumen);
  return rows[0];
}