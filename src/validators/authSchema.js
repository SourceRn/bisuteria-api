import { z } from "zod";

export const loginSchema = z.object({
  correo: z.string().trim().email("Correo invalido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});