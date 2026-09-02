import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// DATABASE_URL viene de Supabase: Project Settings -> Database -> Connection string (URI)
// Ejemplo: postgresql://postgres:[password]@[host]:5432/postgres
if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] Falta DATABASE_URL en tu archivo .env — copia .env.example a .env y agrega tu cadena de conexion de Supabase."
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
});

// Prueba rapida de conexion al arrancar el servidor
export async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("[db] Conectado a Postgres:", result.rows[0].now);
  } catch (err) {
    console.error("[db] No se pudo conectar a la base de datos:", err.message);
  }
}
