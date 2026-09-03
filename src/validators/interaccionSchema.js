import { z } from "zod";

// Debe coincidir exactamente con el CHECK constraint de sql/schema.sql
const TIPOS = ["Pedido", "Llamada", "Correo", "Reunion", "Otro"];

export const crearInteraccionSchema = z.object({
  cliente_id: z.string().uuid("cliente_id debe ser un uuid valido"),
  usuario_id: z.string().uuid("usuario_id debe ser un uuid valido").optional().nullable(),
  tipo: z.enum(TIPOS, {
    message: `tipo debe ser una de: ${TIPOS.join(", ")}`,
  }),
  descripcion: z.string().trim().optional().or(z.literal("")),
});

export const TIPOS_VALIDOS = TIPOS;