import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabaseAdmin] Falta SUPABASE_SERVICE_ROLE_KEY en tu .env — el alta/baja de usuarios no funcionara."
  );
}

// ADVERTENCIA: este cliente tiene privilegios totales sobre Supabase Auth.
// Solo se usa aqui, en el backend. NUNCA debe exponerse a un frontend.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);