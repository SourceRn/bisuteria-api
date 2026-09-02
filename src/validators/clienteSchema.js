import { z } from "zod";

const ESTADOS = ["activo", "inactivo"];
const ETAPAS = ["Prospecto", "Activo", "Frecuente", "Inactivo"];

// Usado en POST /clientes — todos los campos requeridos que tengan sentido al crear
export const crearClienteSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  correo: z.string().trim().email("Correo invalido"),
  telefono: z.string().trim().min(7, "Telefono invalido").optional().or(z.literal("")),
  empresa: z.string().trim().optional().or(z.literal("")),
  estado: z.enum(ESTADOS).optional(),
  etapa_crm: z.enum(ETAPAS).optional(),
});

// Usado en PUT /clientes/:id — todo opcional, se actualiza solo lo que llega
export const actualizarClienteSchema = crearClienteSchema.partial();

// Usado en PUT /clientes/:id/etapa
export const actualizarEtapaSchema = z.object({
  etapa_crm: z.enum(ETAPAS, {
    message: `etapa_crm debe ser una de: ${ETAPAS.join(", ")}`,
  }),
});

export const ETAPAS_VALIDAS = ETAPAS;
export const ESTADOS_VALIDOS = ESTADOS;
