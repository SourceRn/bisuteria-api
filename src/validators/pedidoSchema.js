import { z } from "zod";

const TIPOS = ["reposicion", "venta"];
const ESTADOS = ["pendiente", "en_proceso", "surtido", "cancelado"];

export const crearPedidoScmSchema = z.object({
  producto_id: z.string().uuid("producto_id debe ser un uuid valido"),
  proveedor_id: z.string().uuid("proveedor_id debe ser un uuid valido").optional().nullable(),
  cantidad: z.number().int().positive("cantidad debe ser un numero positivo"),
  tipo: z.enum(TIPOS, { message: `tipo debe ser uno de: ${TIPOS.join(", ")}` }),
  notas: z.string().trim().optional().or(z.literal("")),
});

export const actualizarEstadoPedidoScmSchema = z.object({
  estado: z.enum(ESTADOS, { message: `estado debe ser uno de: ${ESTADOS.join(", ")}` }),
});

export const ESTADOS_VALIDOS = ESTADOS;
export const TIPOS_VALIDOS = TIPOS;