import { z } from "zod";

const ROLES = ["admin", "usuario"];

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  correo: z.string().trim().email("Correo invalido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(ROLES).optional(),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).optional(),
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
});

export const ROLES_VALIDOS = ROLES;