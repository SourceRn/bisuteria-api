import { z } from "zod";

const NIVELES = ["Básico", "Integrado", "Automatizado", "Optimizado"];

export const actualizarEstadoErpSchema = z.object({
  nivel: z.enum(NIVELES, { message: `nivel debe ser uno de: ${NIVELES.join(", ")}` }).optional(),
  checklist: z.array(z.object({ item: z.string(), completado: z.boolean() })).optional(),
  descripcion: z.string().trim().optional(),
});