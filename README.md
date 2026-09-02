# Yatzari API

Backend (API REST) del CRM de Yatzari Bisutería. Node + Express + PostgreSQL (hosteado en Supabase).

## Estructura

```
src/
├── config/db.js          # conexión a Postgres vía DATABASE_URL
├── controllers/           # lógica de negocio de cada recurso
├── routes/                 # definición de endpoints
├── validators/             # esquemas Zod (qué forma debe tener cada request)
├── middleware/
│   └── errorHandler.js    # manejo centralizado de errores
├── app.js                  # configuración de Express (middlewares, rutas)
└── server.js                # arranque del servidor
sql/
└── schema.sql               # definición de las 4 tablas (clientes, interacciones, usuarios, evaluaciones)
```

## Cómo levantarlo

1. **Crea el proyecto en Supabase** (https://supabase.com) — un proyecto nuevo, plan gratuito.
2. **Corre el schema:** Dashboard de Supabase → SQL Editor → New query → pega el contenido de `sql/schema.sql` → Run.
3. **Copia la cadena de conexión:** Project Settings → Database → Connection string → URI.
4. **Configura tus variables de entorno:**
   ```bash
   cp .env.example .env
   # edita .env y pega tu DATABASE_URL
   ```
5. **Instala dependencias y corre en modo desarrollo:**
   ```bash
   npm install
   npm run dev
   ```
6. Deberías ver en consola: `[server] Yatzari API corriendo en http://localhost:3000` y `[db] Conectado a Postgres: ...`

## Endpoints disponibles

### Clientes

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/clientes` | Crea un cliente |
| GET | `/clientes` | Lista clientes. Query params opcionales: `?buscar=texto&estado=activo&etapa=Prospecto` |
| GET | `/clientes/:id` | Obtiene un cliente por id |
| PUT | `/clientes/:id` | Actualiza campos de un cliente (parcial) |
| PUT | `/clientes/:id/etapa` | Cambia solo la etapa CRM del cliente |
| DELETE | `/clientes/:id` | Elimina un cliente |

### Body esperado — POST /clientes

```json
{
  "nombre": "Renata García",
  "correo": "renata@example.com",
  "telefono": "5512345678",
  "empresa": "",
  "estado": "activo",
  "etapa_crm": "Prospecto"
}
```

`telefono`, `empresa`, `estado` y `etapa_crm` son opcionales — si no los mandas, `estado` default es `activo` y `etapa_crm` default es `Prospecto`.

### Body esperado — PUT /clientes/:id/etapa

```json
{ "etapa_crm": "Activo" }
```

Valores válidos: `Prospecto`, `Activo`, `Frecuente`, `Inactivo`.

## Probar sin frontend todavía

Con el server corriendo, prueba con `curl` o Postman/Insomnia:

```bash
# Crear un cliente
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Renata Garcia","correo":"renata@example.com","telefono":"5512345678"}'

# Listar clientes
curl http://localhost:3000/clientes

# Buscar
curl "http://localhost:3000/clientes?buscar=renata"
```

## Pendiente (próximos días)

- [ ] Endpoints de `Interaccion` (POST, GET por cliente)
- [ ] Autenticación (Supabase Auth + middleware JWT) y roles
- [ ] Endpoint de métricas (`/metricas`)
- [ ] Conectar el checkout de Yatzari (storefront) a `POST /clientes` + `POST /interacciones`
