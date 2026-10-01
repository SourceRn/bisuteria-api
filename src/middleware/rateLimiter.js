import rateLimit from "express-rate-limit";

// Limite para las rutas publicas que puede llamar cualquiera sin login
// (el checkout de yatzari-storefront). Protege contra spam/abuso automatizado.
export const limitePublico = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // maximo 10 peticiones por IP por minuto
  message: { error: "Demasiadas solicitudes, intenta de nuevo en un momento." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite para rutas publicas de solo LECTURA (catalogo, etc.) — mucho mas
// permisivo, porque navegar la tienda genera muchas mas consultas que
// las acciones sensibles como crear un cliente o un pedido.
export const limiteLecturaPublica = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // 2 peticiones por segundo en promedio
  message: { error: "Demasiadas solicitudes, intenta de nuevo en un momento." },
  standardHeaders: true,
  legacyHeaders: false,
});