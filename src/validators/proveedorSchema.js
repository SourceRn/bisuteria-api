import { z } from "zod";

export const crearProveedorSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  contacto: z.string().trim().optional().or(z.literal("")),
  correo: z.string().trim().email("Correo invalido").optional().or(z.literal("")),
  telefono: z.string().trim().optional().or(z.literal("")),
});

export const actualizarProveedorSchema = crearProveedorSchema.partial();