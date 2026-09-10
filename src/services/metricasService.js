import { pool } from "../config/db.js";

export async function calcularMetricas(dias = 30) {
  const [
    totalClientesResult,
    porEstadoResult,
    interaccionesPorClienteResult,
    sinInteraccionRecienteResult,
  ] = await Promise.all([
    pool.query("select count(*)::int as total from clientes"),

    pool.query(
      `select estado, count(*)::int as total
       from clientes
       group by estado`
    ),

    pool.query(
      `select c.id as cliente_id, c.nombre, count(i.id)::int as total_interacciones
       from clientes c
       left join interacciones i on i.cliente_id = c.id
       group by c.id, c.nombre
       order by total_interacciones desc`
    ),

    pool.query(
      `select c.id, c.nombre, c.correo, c.etapa_crm,
              (select max(fecha) from interacciones i where i.cliente_id = c.id) as ultima_interaccion
       from clientes c
       where not exists (
         select 1 from interacciones i
         where i.cliente_id = c.id
           and i.fecha >= now() - ($1 || ' days')::interval
       )
       order by ultima_interaccion asc nulls first`,
      [dias]
    ),
  ]);

  const porEstado = { activo: 0, inactivo: 0 };
  porEstadoResult.rows.forEach((row) => {
    porEstado[row.estado] = row.total;
  });

  const totalInteracciones = interaccionesPorClienteResult.rows.reduce(
    (acc, r) => acc + r.total_interacciones,
    0
  );

  return {
    total_clientes: totalClientesResult.rows[0].total,
    clientes_activos: porEstado.activo,
    clientes_inactivos: porEstado.inactivo,
    total_interacciones: totalInteracciones,
    interacciones_por_cliente: interaccionesPorClienteResult.rows,
    clientes_sin_interaccion_reciente: {
      dias_umbral: dias,
      total: sinInteraccionRecienteResult.rows.length,
      clientes: sinInteraccionRecienteResult.rows,
    },
  };
}