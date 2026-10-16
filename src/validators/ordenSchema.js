import { z } from "zod";

const itemSchema = z.object({
  producto_id: z.string().uuid("producto_id debe ser un uuid valido"),
  cantidad: z.coerce.number().int().positive("la cantidad debe ser un entero positivo"),
});

const itemsSchema = z.array(itemSchema).min(1, "La orden debe tener al menos un producto");

export const crearOrdenSchema = z.object({
  cliente_id: z.string().uuid("cliente_id debe ser un uuid valido"),
  items: itemsSchema,
});

// POST /ordenes/procesar: procesa una orden pendiente existente (orden_id),
// o crea y procesa en un solo paso (cliente_id + items).
export const procesarOrdenSchema = z
  .object({
    orden_id: z.string().uuid().optional(),
    cliente_id: z.string().uuid().optional(),
    items: itemsSchema.optional(),
  })
  .refine((d) => d.orden_id || (d.cliente_id && d.items), {
    message: "Envia orden_id, o bien cliente_id junto con items",
  });

export const actualizarEstadoOrdenSchema = z.object({
  estado: z.enum(["procesada", "cancelada"], {
    message: "estado debe ser 'procesada' o 'cancelada'",
  }),
});