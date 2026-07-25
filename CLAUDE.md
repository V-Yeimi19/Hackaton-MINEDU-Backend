# Hackaton MINEDU Backend

Monorepo de microservicios NestJS, dividido por **capas de responsabilidad** entre 2 desarrolladores (no por microservicio), para minimizar bloqueos durante el hackathon.

- **Desarrollador A**: Gateway, Auth, Users, Storage, Notifications, Reports, Docker, seguridad. Todo implementado: Gateway (proxy + rate limit + JWT check), Auth, Users, Storage (MinIO), Notifications (BullMQ + WebSocket + eventos), Reports (reportes institucionales agregados, ver abajo), docker-compose completo.
- **Desarrollador B**: Classroom, Analytics (Gemelo Digital), AI, Accessibility. Los 4 están implementados (ya no son stubs): Classroom (cursos/aulas/asistencia/notas/competencias + eventos), Analytics (indicadores + riesgo + recomendaciones, suscrito a eventos de Classroom), AI (reporte PDF semanal *por aula*, `/api/ai/reports`, orquesta Classroom+Analytics+Storage), Accessibility (pipeline OCR + adaptación de texto vía OpenAI + texto-a-voz).

### Reports vs AI — no son el mismo reporte
`apps/reports` (Dev A) y el `report` module de `apps/ai` (Dev B) coexisten a propósito, con alcance distinto: **AI genera el PDF semanal de una sola aula** (`POST /api/ai/reports/generate`, datos filtrados por `weekStart`/`weekEnd` de una `classroomId`), mientras que **Reports genera un CSV agregado multi-aula** para `ADMIN`/`DIRECTIVO` (`POST /api/reports/generate`, filtrable por `gradeLevel` o `courseId`, sin restringirse a una sola aula) — pensado para dashboards institucionales, no para el reporte docente de una sección. Reports reutiliza los mismos endpoints internos de Classroom/Analytics que ya consume AI (`/internal/classrooms`, `/internal/classroom/:id/attendances`, `/internal/classroom/:id/grades`, `/internal/risk/classroom/:id`) y sube el CSV a Storage con el mismo patrón de `POST /internal/upload`. Si se toca uno de los dos, revisar si el cambio también aplica al otro (misma fuente de datos, agregación distinta).

## Estructura

```
apps/<servicio>/     Proyecto NestJS independiente (package.json propio)
packages/common/     @minedu/common: código compartido entre servicios
docker-compose.yml   Postgres + Redis + MinIO + los 10 servicios
```

Cada app en `apps/*` es un proyecto NestJS **independiente**, no un módulo del mismo proyecto. `pnpm-workspace.yaml` los conecta como workspaces manuales (sin Nx, sin monorepo-mode de Nest) — decisión explícita para que cada servicio pueda separarse a su propio repo sin refactor.

## Convenciones que ya existen (seguirlas al añadir servicios nuevos)

### Controladores sin prefijo propio
El Gateway monta el proxy con `app.use('/api/<servicio>', proxy)`, y Express **ya quita** ese prefijo del `req.url` antes de invocar el middleware de proxy. Por eso los controladores de cada servicio usan `@Controller()` (vacío), no `@Controller('auth')` o `@Controller('users')`. Si un controlador nuevo repite el prefijo del servicio, todas las rutas responderán 404 a través del Gateway.

### Prisma: `output` custom obligatorio
Todo `schema.prisma` debe declarar:
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/prisma"
}
```
Sin esto, dos servicios que comparten la misma versión de `@prisma/client` en el store de pnpm se pisan el cliente generado entre sí (bug real encontrado al construir Auth/Users). El código importa el cliente con ruta relativa: `import { PrismaClient } from '../../generated/prisma'`, no desde `@prisma/client`. La carpeta `generated/` está en `.gitignore`; se regenera con `pnpm --filter <servicio> exec prisma generate`.

### `@minedu/common`
Contiene `Role`, `JwtPayload`, `JwtAuthGuard`, `JwtStrategy`, `RolesGuard` + `@Roles()`, `@CurrentUser()`, `HttpExceptionFilter`, `PaginationDto`. Se resuelve como paquete normal de node_modules (dist compilado), **no** vía `tsconfig paths` a los fuentes — eso se intentó y rompía el build (`nest build` usa `tsc`, que intenta emitir cualquier `.ts` incluido vía path mapping, violando `rootDir`). Consecuencia práctica: **después de tocar `packages/common/src`, hay que correr `pnpm --filter @minedu/common build` antes de que los demás servicios vean el cambio** (dev o build).

### JWT validado en el Gateway Y en cada servicio (defensa en profundidad)
El Gateway verifica el JWT (con `jsonwebtoken`, no Passport) antes de proxyar cualquier prefijo que no esté marcado `public: true` en `apps/gateway/src/config/services.config.ts` (hoy solo `auth` es público) — rechaza con 401 sin llegar al servicio si falta o es inválido. **Pero cada servicio sigue validando el JWT de forma independiente** con `JwtStrategy`/`JwtAuthGuard` de `@minedu/common` (`PassportModule` + el strategy como provider, ver `apps/users/src/auth/auth.module.ts`) — no confíes solo en el Gateway. Todos comparten el mismo `JWT_SECRET` por env. El Gateway reenvía `x-user-id`/`x-user-email`/`x-user-role` como headers de conveniencia (no se usan todavía downstream); por seguridad, el Gateway los limpia de cualquier request entrante antes de fijarlos él mismo (`stripForwardedIdentityHeaders`), para que un cliente no pueda falsificarlos en rutas públicas.

### Llamadas internas entre servicios
Se protegen con `InternalKeyGuard` (en `@minedu/common`) que compara el header `x-internal-key` contra `INTERNAL_API_KEY`. Ya usado en Users (`POST /internal`, llamado por Auth) y Notifications (`POST /internal`, para que cualquier servicio dispare una notificación). Reusar el mismo guard para nuevos endpoints internos, no duplicarlo.

### Eventos entre servicios (Redis Pub/Sub) y colas (BullMQ)
`@minedu/common` expone `RedisPubSubService` + `RedisPubSubModule` (importar una vez en `AppModule`, queda `@Global()`) y el catálogo `EVENTS` (`event-names.ts`) — hoy solo `EVENTS.USER_CREATED`. Patrón de referencia ya funcionando:
- **Auth publica** `user.created` al registrar (`apps/auth/src/auth/auth.service.ts`), en un `try/catch` que no bloquea el registro si Redis falla.
- **Notifications se suscribe** (`apps/notifications/src/events/events-subscriber.service.ts`) y encola una notificación de bienvenida vía BullMQ (`@nestjs/bullmq`, cola `notifications`), cuyo `NotificationsProcessor` persiste en Postgres y empuja por WebSocket (`NotificationsGateway`, namespace `/notifications`, autenticado con el JWT en `handshake.auth.token`).

Para un evento nuevo (ej. `attendance.updated` de Classroom): agregar la constante a `EVENTS` en `@minedu/common`, publicar desde el servicio origen, suscribirse desde el/los servicios interesados en su `OnModuleInit`. El WebSocket de Notifications **no pasa por el Gateway** (el cliente se conecta directo a `NOTIFICATIONS_SERVICE_URL`); proxyar upgrade requests de WebSocket a través de `http-proxy-middleware` queda pendiente si se necesita.

### bcryptjs, no bcrypt
`bcrypt` (nativo) falla al compilar su binding en este entorno (pnpm + Windows). Se usa `bcryptjs` (puro JS). No reintroducir `bcrypt`.

### Env validation con Joi
Cada servicio valida sus variables de entorno en `src/config/env.validation.ts` con Joi, cargado vía `ConfigModule.forRoot({ isGlobal: true, validationSchema })`. Copiar ese patrón para servicios nuevos en vez de leer `process.env` directo.

### Dockerfile: copiar todo el repo, no `pnpm deploy`
Los Dockerfiles multi-stage copian `/repo` completo del stage de build al de runtime (en vez de `pnpm deploy --prod`) para evitar problemas de symlinks de pnpm rotos entre stages. Es más pesado pero confiable. Ver `apps/auth/Dockerfile` como plantilla si un stub se vuelve real (agregar el bloque de `packages` + `prisma generate` solo si el servicio usa Prisma o `@minedu/common`).

## Cómo convertir un stub en servicio real (para B)

1. En `apps/<servicio>/package.json` agregar las dependencias que necesite (Prisma, `@minedu/common`, etc.).
2. Si usa base de datos: agregar `prisma/schema.prisma` con el `output` custom de arriba; la base ya existe en Postgres (`<servicio>_db`, creada por `docker/postgres/init-multiple-dbs.sh`).
3. Si necesita JWT: replicar `apps/users/src/auth/auth.module.ts`.
4. Actualizar `apps/<servicio>/Dockerfile` siguiendo `apps/auth/Dockerfile` si agrega Prisma/`@minedu/common`.
5. No hace falta tocar `docker-compose.yml` ni el Gateway — las rutas y variables de entorno (`<SERVICIO>_SERVICE_URL`) ya están configuradas para los 9 servicios.

## Verificación local

```bash
pnpm install
docker compose up -d postgres redis minio
pnpm --filter auth prisma:migrate
pnpm --filter users prisma:migrate
pnpm --filter storage prisma:migrate
pnpm --filter notifications prisma:migrate
pnpm dev:gateway   # y dev:auth, dev:users, etc. en otras terminales
```

Flujos de humo ya verificados funcionando:
- `POST /api/auth/register` → `POST /api/auth/login` → `GET /api/users/:id` con Bearer token (self-access ok, roles no autorizados dan 403, sin token da 401 **del Gateway** antes de llegar a Users).
- Registro dispara `user.created` → Notifications crea y persiste una notificación de bienvenida, visible en `GET /api/notifications` con el JWT del usuario recién creado.
- Storage: `POST /api/storage/upload` (multipart) → `GET /api/storage/:id` (metadata) → `GET /api/storage/:id/download` (302 a URL prefirmada de MinIO) → `DELETE /api/storage/:id` → `GET` posterior da 404.
- Rate limiter del Gateway responde con headers `RateLimit-*` en cada request.

`docker compose up --build` completo (las 10 imágenes) no se pudo validar en el sandbox de este agente por una política de red del registry proxeado (`minimumReleaseAge`) — es una restricción del entorno del agente, no del código; probablemente no ocurra en una máquina normal.
