import { registrarMovimiento, generarPedidoPushSiAplica } from "../controllers/movimientosController.js";
import { ApiError } from "../middleware/errorHandler.js";

const redondear = (n) => Math.round(n * 100) / 100;

export const formatearFolio = (n) => `OR-${String(n).padStart(3, "0")}`;

// Une productos repetidos y los ordena por id: asi los bloqueos de filas
// siempre se toman en el mismo orden y dos ordenes simultaneas no se traban.
function normalizarItems(items) {
  const mapa = new Map();
  for (const { producto_id, cantidad } of items) {
    mapa.set(producto_id, (mapa.get(producto_id) || 0) + cantidad);
  }
  return Array.from(mapa, ([producto_id, cantidad]) => ({ producto_id, cantidad })).sort((a, b) =>
    a.producto_id < b.producto_id ? -1 : 1
  );
}

async function registrarPaso(client, orden_id, paso, descripcion, usuario_id) {
  const { rows } = await client.query(
    `insert into procesos_internos (orden_id, paso, descripcion, usuario_id)
     values ($1, $2, $3, $4)
     returning paso, descripcion, estado, fecha`,
    [orden_id, paso, descripcion || null, usuario_id || null]
  );
  return rows[0];
}

// Crea la orden en estado "pendiente". No toca el inventario.
// Los precios salen de la base de datos, nunca de lo que mande el navegador.
export async function crearOrden(client, { cliente_id, usuario_id, origen, items }, pasos = []) {
  const clienteRes = await client.query("select id from clientes where id = $1", [cliente_id]);
  if (clienteRes.rows.length === 0) throw new ApiError(404, "El cliente indicado no existe");

  const normalizados = normalizarItems(items);

  const prodRes = await client.query(
    "select id, nombre, precio_venta from productos where id = any($1::uuid[])",
    [normalizados.map((i) => i.producto_id)]
  );
  const porId = new Map(prodRes.rows.map((p) => [p.id, p]));

  if (normalizados.some((i) => !porId.has(i.producto_id))) {
    throw new ApiError(404, "Uno o mas productos ya no existen");
  }

  const lineas = normalizados.map((i) => {
    const precio = Number(porId.get(i.producto_id).precio_venta);
    return { ...i, precio_unitario: precio, subtotal: redondear(precio * i.cantidad) };
  });
  const total = redondear(lineas.reduce((acc, l) => acc + l.subtotal, 0));

  const ordenRes = await client.query(
    `insert into ordenes (cliente_id, usuario_id, origen, estado, total)
     values ($1, $2, $3, 'pendiente', $4)
     returning *`,
    [cliente_id, usuario_id || null, origen, total]
  );
  const orden = ordenRes.rows[0];

  for (const l of lineas) {
    await client.query(
      `insert into orden_items (orden_id, producto_id, cantidad, precio_unitario, subtotal)
       values ($1, $2, $3, $4, $5)`,
      [orden.id, l.producto_id, l.cantidad, l.precio_unitario, l.subtotal]
    );
  }

  pasos.push(
    await registrarPaso(client, orden.id, "Creando orden", `Orden con ${lineas.length} producto(s), total $${total}`, usuario_id)
  );

  return { ...orden, total: Number(orden.total), folio_texto: formatearFolio(orden.folio) };
}

// Procesa una orden pendiente: valida stock, descuenta inventario (con regla PUSH),
// guarda el historial en el CRM y la marca como procesada. Todo dentro de la
// transaccion que abre quien la llama: si algo falla, no queda nada a medias.
export async function procesarOrden(client, { orden_id, usuario_id }, pasos = []) {
  const ordenRes = await client.query("select * from ordenes where id = $1 for update", [orden_id]);
  if (ordenRes.rows.length === 0) throw new ApiError(404, "Orden no encontrada");
  const orden = ordenRes.rows[0];
  if (orden.estado !== "pendiente") throw new ApiError(400, `La orden ya esta ${orden.estado}`);

  const itemsRes = await client.query(
    `select oi.producto_id, oi.cantidad, p.nombre
     from orden_items oi
     join productos p on p.id = oi.producto_id
     where oi.orden_id = $1
     order by oi.producto_id`,
    [orden_id]
  );
  const items = itemsRes.rows;
  const folio = formatearFolio(orden.folio);

  // 1. Validar stock (bloquea las filas de producto hasta el final de la transaccion)
  const stockRes = await client.query(
    `select id, stock_actual from productos where id = any($1::uuid[]) order by id for update`,
    [items.map((i) => i.producto_id)]
  );
  const stockPorId = new Map(stockRes.rows.map((p) => [p.id, p.stock_actual]));

  const problemas = items
    .filter((i) => i.cantidad > stockPorId.get(i.producto_id))
    .map((i) => `"${i.nombre}" (disponibles ${stockPorId.get(i.producto_id)}, solicitados ${i.cantidad})`);
  if (problemas.length > 0) {
    throw new ApiError(400, `Stock insuficiente en: ${problemas.join("; ")}`);
  }
  pasos.push(await registrarPaso(client, orden_id, "Validando stock", "Existencias suficientes para todos los productos", usuario_id));

  // 2. Inventario: una salida por producto; si deja un PUSH en su minimo, se genera la reposicion
  const reposiciones = [];
  for (const item of items) {
    const { producto, stockNuevo } = await registrarMovimiento(client, {
      producto_id: item.producto_id,
      usuario_id,
      tipo: "salida",
      cantidad: item.cantidad,
      motivo: "venta",
    });
    const pedido = await generarPedidoPushSiAplica(client, producto, stockNuevo);
    if (pedido) reposiciones.push({ ...pedido, producto_nombre: item.nombre });
  }
  pasos.push(
    await registrarPaso(
      client,
      orden_id,
      "Actualizando inventario y registrando movimientos",
      `Salidas registradas para ${items.length} producto(s)` +
        (reposiciones.length > 0 ? `; reposicion automatica PUSH para ${reposiciones.length}` : ""),
      usuario_id
    )
  );

  // 3. Historial en el CRM (asi "Pedidos" y "Mis pedidos" siguen funcionando igual)
  const descripcion = `${items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ")} — Total: $${Number(orden.total)} (${folio})`;
  await client.query(
    `insert into interacciones (cliente_id, usuario_id, tipo, descripcion)
     values ($1, $2, 'Pedido', $3)`,
    [orden.cliente_id, usuario_id || null, descripcion]
  );
  pasos.push(await registrarPaso(client, orden_id, "Guardando historial", "Interaccion registrada en el historial del cliente (CRM)", usuario_id));

  // 4. Cierre
  const finalRes = await client.query("update ordenes set estado = 'procesada' where id = $1 returning *", [orden_id]);
  pasos.push(await registrarPaso(client, orden_id, "Finalizando operación", `Orden ${folio} procesada`, usuario_id));

  return {
    orden: { ...finalRes.rows[0], total: Number(finalRes.rows[0].total), folio_texto: folio },
    pasos,
    reposiciones_generadas: reposiciones,
  };
}

// Crea y procesa en un solo paso (lo usan el asistente del ERP y el checkout del storefront)
export async function crearYProcesarOrden(client, { cliente_id, usuario_id, origen, items }) {
  const pasos = [];
  const orden = await crearOrden(client, { cliente_id, usuario_id, origen, items }, pasos);
  return procesarOrden(client, { orden_id: orden.id, usuario_id }, pasos);
}

// Cancela una orden. Si ya estaba procesada, devuelve las existencias con entradas
// de tipo "ajuste" y cancela las reposiciones automaticas (PUSH) que dejaron de hacer falta.
export async function cancelarOrden(client, orden, usuario_id) {
  if (orden.estado === "cancelada") throw new ApiError(400, "La orden ya esta cancelada");

  const pasos = [];
  const folio = formatearFolio(orden.folio);
  let reposicionesCanceladas = [];
  let reposicionesEnProceso = [];

  if (orden.estado === "procesada") {
    const itemsRes = await client.query(
      "select producto_id, cantidad from orden_items where orden_id = $1 order by producto_id",
      [orden.id]
    );
    for (const item of itemsRes.rows) {
      await registrarMovimiento(client, {
        producto_id: item.producto_id,
        usuario_id,
        tipo: "entrada",
        cantidad: item.cantidad,
        motivo: "ajuste",
      });
    }
    pasos.push(await registrarPaso(client, orden.id, "Restituyendo inventario", "Entradas por ajuste para devolver las existencias", usuario_id));

    const productoIds = itemsRes.rows.map((i) => i.producto_id);

    // Con el stock restituido, las reposiciones automaticas pendientes de estos
    // productos que ya quedaron por encima del minimo dejan de ser necesarias.
    const canceladas = await client.query(
      `update pedidos_scm p
       set estado = 'cancelado',
           notas = coalesce(p.notas || ' | ', '') || $2
       from productos pr
       where pr.id = p.producto_id
         and p.producto_id = any($1::uuid[])
         and p.usuario_id is null
         and p.tipo = 'reposicion'
         and p.estado = 'pendiente'
         and pr.stock_actual > pr.stock_minimo
       returning p.id, p.cantidad, pr.nombre as producto_nombre`,
      [productoIds, `Cancelado automaticamente: la orden ${folio} se cancelo y el stock se restituyo`]
    );
    reposicionesCanceladas = canceladas.rows;

    // Las "en_proceso" no se cancelan solas: solo se reportan
    const enProceso = await client.query(
      `select p.id, p.cantidad, pr.nombre as producto_nombre
       from pedidos_scm p
       join productos pr on pr.id = p.producto_id
       where p.producto_id = any($1::uuid[])
         and p.usuario_id is null
         and p.tipo = 'reposicion'
         and p.estado = 'en_proceso'
         and pr.stock_actual > pr.stock_minimo`,
      [productoIds]
    );
    reposicionesEnProceso = enProceso.rows;

    if (reposicionesCanceladas.length > 0) {
      pasos.push(
        await registrarPaso(
          client,
          orden.id,
          "Cancelando reposición automática",
          `Reposición PUSH ya innecesaria para: ${reposicionesCanceladas.map((r) => r.producto_nombre).join(", ")}`,
          usuario_id
        )
      );
    }

    await client.query(
      `insert into interacciones (cliente_id, usuario_id, tipo, descripcion)
       values ($1, $2, 'Otro', $3)`,
      [orden.cliente_id, usuario_id || null, `Orden ${folio} cancelada`]
    );
  }

  const { rows } = await client.query("update ordenes set estado = 'cancelada' where id = $1 returning *", [orden.id]);
  pasos.push(await registrarPaso(client, orden.id, "Orden cancelada", `Orden ${folio} cancelada`, usuario_id));

  return {
    orden: { ...rows[0], total: Number(rows[0].total), folio_texto: folio },
    pasos,
    reposiciones_canceladas: reposicionesCanceladas,
    reposiciones_en_proceso: reposicionesEnProceso,
  };
}