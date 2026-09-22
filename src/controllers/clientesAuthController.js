import { z } from "zod";
import { pool } from "../config/db.js";
import { supabase } from "../config/supabase.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

const vincularSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  telefono: z.string().trim().optional().or(z.literal("")),
});

// POST /clientes/vincular-cuenta
// Se llama justo despues de supabase.auth.signUp() en el storefront.
// Crea (o vincula, si ya existia como comprador "espontaneo") la fila en "clientes".
export const vincularCuenta = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Falta el token de la cuenta recién creada");
  }
  const token = authHeader.split(" ")[1];

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new ApiError(401, "Token inválido");
  }

  const datos = vincularSchema.parse(req.body);
  const correo = data.user.email;
  const authId = data.user.id;

  // Si ya existia como cliente sin cuenta (compro antes como "espontaneo"),
  // vinculamos su cuenta nueva a ese historial en vez de crear un duplicado.
  const existente = await pool.query("select * from clientes where correo = $1", [correo]);

  let cliente;
  if (existente.rows.length > 0) {
    const { rows } = await pool.query(
      `update clientes
       set auth_id = $1,
           nombre = coalesce(nullif($2, ''), nombre),
           telefono = coalesce(nullif($3, ''), telefono)
       where id = $4
       returning *`,
      [authId, datos.nombre, datos.telefono || null, existente.rows[0].id]
    );
    cliente = rows[0];
  } else {
    const { rows } = await pool.query(
      `insert into clientes (nombre, correo, telefono, auth_id)
       values ($1, $2, $3, $4)
       returning *`,
      [datos.nombre, correo, datos.telefono || null, authId]
    );
    cliente = rows[0];
  }

  res.status(201).json(cliente);
});

// GET /clientes/me
export const obtenerMiPerfil = asyncHandler(async (req, res) => {
  res.json(req.cliente);
});

// GET /clientes/me/pedidos
export const obtenerMisPedidos = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `select id, descripcion, fecha from interacciones
     where cliente_id = $1 and tipo = 'Pedido'
     order by fecha desc`,
    [req.cliente.id]
  );
  res.json(rows);
});