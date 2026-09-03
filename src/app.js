import express from "express";
import cors from "cors";
import clientesRoutes from "./routes/clientesRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import interaccionesRoutes from "./routes/interaccionesRoutes.js";

export const app = express();

app.use(cors()); // en produccion, restringir a los dominios de yatzari y yatzari-crm
app.use(express.json());

// Ruta de salud — util para confirmar que el server esta arriba (y luego, en deploy, para el hosting)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/clientes", clientesRoutes);
app.use("/interacciones", interaccionesRoutes);

// TODO: cuando lleguemos a auth -> app.use("/auth", authRoutes)
// TODO: cuando lleguemos a metricas -> app.use("/metricas", metricasRoutes)

// 404 para rutas no definidas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Debe ir al final: captura cualquier error pasado con next(err)
app.use(errorHandler);
