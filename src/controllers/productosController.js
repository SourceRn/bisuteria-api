import { pool } from "../config/db.js";
import {
  crearProductoSchema,
  actualizarProductoSchema,
  actualizarEstrategiaSchema,
} from "../validators/productoSchema.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";

// POST /productos
export const crearProducto = asyncHandler(async (req, res) => {
  const d = crearProductoSchema.parse(req.body);

  const { rows } = await pool.query(
    `insert into productos
       (nombre, descripcion, categoria, stock_actual, stock_minimo, proveedor_id, costo_unitario, precio_venta, imagen_url, estrategia_logistica)
     values ($1, $2, $3, coalesce($4, 0), coalesce($5, 0), $6, coalesce($7, 0), coalesce($8, 0), $9, coalesce($10, 'PULL'))
     returning *`,
    [
      d.nombre,
      d.descripcion || null,
      d.categoria || null,
      d.stock_actual,
      d.stock_minimo,
      d.proveedor_id || null,
      d.costo_unitario,
      d.precio_venta,
      d.imagen_url || null,
      d.estrategia_logistica,
    ]
  );

  res.status(201).json(rows[0]);
});

// GET /productos?buscar=texto&categoria=...&estrategia=PUSH&stock_bajo=true
export const listarProductos = asyncHandler(async (req, res) => {
  const { buscar, categoria, estrategia, stock_bajo } = req.query;

  const condiciones = [];
  const valores = [];

  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`p.nombre ilike $${valores.length}`);
  }
  if (categoria) {
    valores.push(categoria);
    condiciones.push(`categoria = $${valores.length}`);
  }
  if (estrategia) {
    valores.push(estrategia);
    condiciones.push(`estrategia_logistica = $${valores.length}`);
  }
  if (stock_bajo === "true") {
    condiciones.push(`stock_actual <= stock_minimo`);
  }

  const whereClause = condiciones.length ? `where ${condiciones.join(" and ")}` : "";

  const { rows } = await pool.query(
    `select p.*, pr.nombre as proveedor_nombre
     from productos p
     left join proveedores pr on pr.id = p.proveedor_id
     ${whereClause}
     order by p.nombre asc`,
    valores
  );

  res.json(rows);
});

// GET /productos/:id
export const obtenerProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query(
    `select p.*, pr.nombre as proveedor_nombre
     from productos p
     left join proveedores pr on pr.id = p.proveedor_id
     where p.id = $1`,
    [id]
  );

  if (rows.length === 0) throw new ApiError(404, "Producto no encontrado");
  res.json(rows[0]);
});

// PUT /productos/:id
export const actualizarProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const datos = actualizarProductoSchema.parse(req.body);

  const campos = Object.keys(datos);
  if (campos.length === 0) throw new ApiError(400, "No se enviaron campos para actualizar");

  const asignaciones = campos.map((campo, i) => `${campo} = $${i + 1}`).join(", ");
  const valores = campos.map((campo) => datos[campo]);
  valores.push(id);

  const { rows } = await pool.query(
    `update productos set ${asignaciones} where id = $${valores.length} returning *`,
    valores
  );

  if (rows.length === 0) throw new ApiError(404, "Producto no encontrado");
  res.json(rows[0]);
});

// PUT /productos/:id/estrategia
export const actualizarEstrategiaProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estrategia_logistica } = actualizarEstrategiaSchema.parse(req.body);

  const { rows } = await pool.query(
    "update productos set estrategia_logistica = $1 where id = $2 returning *",
    [estrategia_logistica, id]
  );

  if (rows.length === 0) throw new ApiError(404, "Producto no encontrado");
  res.json(rows[0]);
});

// DELETE /productos/:id
export const eliminarProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await pool.query("delete from productos where id = $1 returning id", [id]);

  if (rows.length === 0) throw new ApiError(404, "Producto no encontrado");
  res.status(204).send();
});

// GET /productos/catalogo — PUBLICO, solo campos seguros para mostrar en el storefront.
// No expone costo_unitario, stock_minimo, proveedor_id ni estrategia_logistica.
export const obtenerCatalogoPublico = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `select id, nombre, descripcion, categoria, precio_venta, stock_actual, imagen_url
     from productos
     where stock_actual > 0
     order by nombre asc`
  );

  res.json(rows);
});

// POST /productos/verificar-stock — PUBLICA. Verifica si una lista de
// productos/cantidades caben en el stock actual, SIN modificar nada.
// Se usa en el checkout del storefront antes de confirmar una compra.
export const verificarStock = asyncHandler(async (req, res) => {
  const { items } = req.body; // [{ producto_id, cantidad }]

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "items debe ser un arreglo no vacio");
  }

  const ids = items.map((i) => i.producto_id);
  const { rows } = await pool.query(
    `select id, nombre, stock_actual from productos where id = any($1::uuid[])`,
    [ids]
  );

  const stockPorId = new Map(rows.map((r) => [r.id, r]));

  const problemas = items
    .map((item) => {
      const producto = stockPorId.get(item.producto_id);
      if (!producto) {
        return { producto_id: item.producto_id, nombre: "Producto desconocido", motivo: "no_existe" };
      }
      if (item.cantidad > producto.stock_actual) {
        return {
          producto_id: item.producto_id,
          nombre: producto.nombre,
          motivo: "stock_insuficiente",
          disponible: producto.stock_actual,
          solicitado: item.cantidad,
        };
      }
      return null;
    })
    .filter(Boolean);

  res.json({ valido: problemas.length === 0, problemas });
});