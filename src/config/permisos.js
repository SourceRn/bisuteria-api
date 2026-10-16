// Etiquetas y modulos del menu por rol. El ERP arma su menu dinamico con
// GET /usuarios/rol, asi que cambiar el menu de un rol es editar solo este archivo.
export const ETIQUETAS_ROL = {
  admin: "Administrador",
  ventas: "Ventas",
  logistica: "Logística",
};

export const MODULOS_POR_ROL = {
  admin: ["inicio", "clientes", "productos", "inventario", "ordenes", "reportes", "nivel_erp", "usuarios"],
  ventas: ["inicio", "clientes", "productos", "ordenes", "reportes", "mi_actividad"],
  logistica: ["inicio", "productos", "inventario", "ordenes", "reportes"],
};