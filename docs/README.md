# Documentación del backend MINEDU

Índice de referencia para entender la arquitectura completa del monorepo. Generado el 2026-07-25 tras el primer despliegue end-to-end completo (VPS, 10 servicios).

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — topología del sistema, flujo de una request, modelo de autenticación, despliegue Docker, variables de entorno.
- **[SERVICES.md](./SERVICES.md)** — ficha por servicio: responsabilidad, endpoints públicos e internos, de quién depende, qué eventos publica/consume.
- **[DATABASE.md](./DATABASE.md)** — los 9 esquemas de Postgres (uno por servicio con base de datos propia), campo por campo.
- **[PENDING.md](./PENDING.md)** — lista de features/deuda técnica pendiente, con checkboxes. Empezar por ahí antes de preguntar "¿qué falta?".

## Cómo se mantiene esto al día

Estos documentos son una fotografía del estado del código a la fecha de arriba. Si cambias un modelo Prisma, agregas un endpoint, o conectas un servicio nuevo a otro, actualiza el archivo correspondiente en el mismo cambio — igual que se hace con `CLAUDE.md`. Si notas que algo aquí ya no coincide con el código, el código manda: corrige el doc, no al revés.
