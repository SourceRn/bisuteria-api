// Clase de error propia para poder distinguir errores "esperados" (404, 400, etc.)
// de errores inesperados del servidor.
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Envuelve funciones async de controladores para no repetir try/catch en cada una.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Middleware final: captura cualquier error pasado con next(err) y responde JSON consistente.
export function errorHandler(err, req, res, next) {
  // Error de validacion de Zod
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Datos invalidos",
      detalles: err.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
    });
  }

  // Violacion de restriccion unica en Postgres (ej. correo duplicado)
  if (err.code === "23505") {
    return res.status(409).json({ error: "Ya existe un registro con ese valor unico (ej. correo)." });
  }

  // Nuestros errores controlados (ApiError)
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error("[error inesperado]", err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
