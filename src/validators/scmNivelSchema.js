import { z } from "zod";

const NIVELES = ["Inicial", "En desarrollo", "Optimizado"];

export const actualizarNivelSchema = z.object({
  nivel: z.enum(NIVELES).optional(),
  checklist: z
    .array(
      z.object({
        item: z.string(),
        completado: z.boolean(),
      })
    )
    .optional(),
  descripcion: z.string().trim().optional(),
});

export const NIVELES_VALIDOS = NIVELES;