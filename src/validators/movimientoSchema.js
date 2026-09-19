import { z } from "zod";

const TIPOS = ["entrada", "salida"];
const MOTIVOS = ["venta", "ajuste", "reposicion", "compra"];

export const crearMovimientoSchema = z.object({
  producto_id: z.string().uuid("producto_id debe ser un uuid valido"),
  usuario_id: z.string().uuid("usuario_id debe ser un uuid valido").optional().nullable(),
  tipo: z.enum(TIPOS, { message: `tipo debe ser una de: ${TIPOS.join(", ")}` }),
  cantidad: z.number().int().positive("cantidad debe ser un numero positivo"),
  motivo: z.enum(MOTIVOS, { message: `motivo debe ser uno de: ${MOTIVOS.join(", ")}` }),
});

export const TIPOS_VALIDOS = TIPOS;
export const MOTIVOS_VALIDOS = MOTIVOS;