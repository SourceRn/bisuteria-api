import express from "express";
import cors from "cors";
import clientesRoutes from "./routes/clientesRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import interaccionesRoutes from "./routes/interaccionesRoutes.js";
import metricasRoutes from "./routes/metricasRoutes.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import evaluacionesRoutes from "./routes/evaluacionesRoutes.js";
import pedidosRoutes from "./routes/pedidosRoutes.js";
import productosRoutes from "./routes/productosRoutes.js";
import proveedoresRoutes from "./routes/proveedoresRoutes.js";
import movimientosRoutes from "./routes/movimientosRoutes.js";
import clientesAuthRoutes from "./routes/clientesAuthRoutes.js";
import pedidosScmRoutes from "./routes/pedidosScmRoutes.js";
import scmNivelRoutes from "./routes/scmNivelRoutes.js";
import ordenesRoutes from "./routes/ordenesRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import erpRoutes from "./routes/erpRoutes.js";

export const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  ...(process.env.CORS_ORIGINS?.split(",").map(o => o.trim()) ?? []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Bloqueado: ${origin}`);
    return callback(null, false);   // 👈 false en vez de Error
  },
  credentials: true,
}));

app.use(express.json());

// Ruta de salud — util para confirmar que el server esta arriba (y luego, en deploy, para el hosting)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/clientes", clientesAuthRoutes); // rutas especificas primero: /vincular-cuenta, /me, /me/pedidos
app.use("/clientes", clientesRoutes);
app.use("/interacciones", interaccionesRoutes);
app.use("/metricas", metricasRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/evaluaciones", evaluacionesRoutes);
app.use("/pedidos", pedidosRoutes);
app.use("/productos", productosRoutes);
app.use("/proveedores", proveedoresRoutes);
app.use("/inventario", movimientosRoutes);
app.use("/pedidos-scm", pedidosScmRoutes);
app.use("/scm", scmNivelRoutes);
app.use("/ordenes", ordenesRoutes);
app.use("/auth", authRoutes);
app.use("/erp", erpRoutes);

// 404 para rutas no definidas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Debe ir al final: captura cualquier error pasado con next(err)
app.use(errorHandler);
