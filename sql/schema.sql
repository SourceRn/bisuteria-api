-- Schema de Yatzari CRM
-- Ejecuta esto en Supabase: Dashboard -> SQL Editor -> New query -> pega y corre.
-- Es mas confiable que crear las tablas a mano campo por campo desde la UI.

create extension if not exists "pgcrypto"; -- necesario para gen_random_uuid()

-- ==========================
-- USUARIOS (administradores del CRM)
-- ==========================
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  correo text not null unique,
  rol text not null default 'usuario' check (rol in ('admin', 'usuario')),
  auth_id uuid unique, -- referencia al usuario en Supabase Auth (se llena en el dia de login)
  fecha_registro timestamptz not null default now()
);

-- ==========================
-- CLIENTES
-- ==========================
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  correo text not null unique,
  telefono text,
  empresa text, -- opcional, lo dejamos por si en el futuro hay clientes mayoristas
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  etapa_crm text not null default 'Prospecto' check (etapa_crm in ('Prospecto', 'Activo', 'Frecuente', 'Inactivo')),
  fecha_registro timestamptz not null default now()
);

-- ==========================
-- INTERACCIONES
-- ==========================
create table if not exists interacciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  usuario_id uuid references usuarios(id), -- quien registro la interaccion (null si fue automatica, ej. un pedido)
  tipo text not null check (tipo in ('Pedido', 'Llamada', 'Correo', 'Reunion', 'Otro')),
  descripcion text,
  fecha timestamptz not null default now()
);

-- ==========================
-- EVALUACIONES (metricas guardadas / snapshots, opcional segun necesites historial)
-- ==========================
create table if not exists evaluaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  tipo_evaluacion text not null,
  valor numeric,
  notas text,
  fecha timestamptz not null default now()
);

-- Indices para las consultas mas comunes (busqueda, filtro por estado/etapa)
create index if not exists idx_clientes_correo on clientes(correo);
create index if not exists idx_clientes_etapa on clientes(etapa_crm);
create index if not exists idx_interacciones_cliente on interacciones(cliente_id);
