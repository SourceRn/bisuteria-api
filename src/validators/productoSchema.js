import { z } from "zod";

const ESTRATEGIAS = ["PUSH", "PULL"];

export const crearProductoSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().trim().optional().or(z.literal("")),
  categoria: z.string().trim().optional().or(z.literal("")),
  stock_actual: z.number().int().min(0).optional(),
  stock_minimo: z.number().int().min(0).optional(),
  proveedor_id: z.string().uuid("proveedor_id debe ser un uuid valido").optional().nullable(),
  costo_unitario: z.number().min(0).optional(),
  estrategia_logistica: z.enum(ESTRATEGIAS).optional(),
});

export const actualizarProductoSchema = crearProductoSchema.partial();

export const actualizarEstrategiaSchema = z.object({
  estrategia_logistica: z.enum(ESTRATEGIAS, {
    message: `estrategia_logistica debe ser una de: ${ESTRATEGIAS.join(", ")}`,
  }),
});

export const ESTRATEGIAS_VALIDAS = ESTRATEGIAS;