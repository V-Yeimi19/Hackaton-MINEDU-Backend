# Hackaton MINEDU Backend

Monorepo de microservicios NestJS, dividido por **capas de responsabilidad** entre 2 desarrolladores (no por microservicio), para minimizar bloqueos durante el hackathon.

Este archivo cubre convenciones y reglas prácticas. Para el mapa completo de arquitectura, servicios y esquemas de base de datos, ver **[docs/](./docs/README.md)** (`docs/ARCHITECTURE.md`, `docs/SERVICES.md`, `docs/DATABASE.md`).

- **Desarrollador A**: Gateway, Auth, Users, Storage, Notifications, Reports, Docker, seguridad. Todo implementado: Gateway (proxy + rate limit + JWT check), Auth, Users, Storage (MinIO), Notifications (BullMQ + WebSocket + eventos), Reports (reportes institucionales agregados, ver abajo), docker-compose completo.
- **Desarrollador B**: Classroom, Analytics (Gemelo Digital), AI, Accessibility. Los 4 están implementados (ya no son stubs): Classroom (cursos/aulas/asistencia/notas/competencias + eventos), Analytics (indicadores + riesgo + recomendaciones, suscrito a eventos de Classroom incluyendo `competency.evaluated`), AI (reporte PDF semanal *por aula*, `/api/ai/reports`, orquesta Classroom+Analytics+Storage), Accessibility (pipeline OCR + adaptación de texto vía Groq + subtítulos SRT + pictogramas ARASAAC + texto-a-voz con ElevenLabs, persiste audio/subtítulos/pictogramas en Storage).

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
Contiene `Role`, `JwtPayload`, `JwtAuthGuard`, `JwtStrategy`, `RolesGuard` + `@Roles()`, `@CurrentUser()`, `InternalKeyGuard`, `HttpExceptionFilter`, `PaginationDto`, `RedisPubSubService` + `RedisPubSubModule`, `EVENTS`. Se resuelve como paquete normal de node_modules (dist compilado), **no** vía `tsconfig paths` a los fuentes — eso se intentó y rompía el build (`nest build` usa `tsc`, que intenta emitir cualquier `.ts` incluido vía path mapping, violando `rootDir`). Consecuencia práctica: **después de tocar `packages/common/src`, hay que correr `pnpm --filter @minedu/common build` antes de que los demás servicios vean el cambio** (dev o build).

### Módulos NestJS: exportar los servicios que otro módulo va a inyectar
Si un `providers: [XService]` no va también en `exports: [XService]`, cualquier módulo que importe ese módulo y trate de inyectar `XService` falla con `UnknownDependenciesException` — **pero solo al bootear la app**, nunca en tiempo de compilación (`nest build` pasa limpio). Pasó dos veces en este repo (`FilesModule` en Storage, `ReportModule` en AI) y no se detectó hasta el primer despliegue Docker real, porque nadie había arrancado esos servicios de punta a punta antes. Si agregas un módulo cuyo servicio será usado desde otro módulo, exporta el servicio desde el primer commit.

### JWT validado en el Gateway Y en cada servicio (defensa en profundidad)
El Gateway verifica el JWT (con `jsonwebtoken`, no Passport) antes de proxyar cualquier prefijo que no esté marcado `public: true` en `apps/gateway/src/config/services.config.ts` (hoy solo `auth` es público) — rechaza con 401 sin llegar al servicio si falta o es inválido. **Pero cada servicio sigue validando el JWT de forma independiente** con `JwtStrategy`/`JwtAuthGuard` de `@minedu/common` (`PassportModule` + el strategy como provider, ver `apps/users/src/auth/auth.module.ts`) — no confíes solo en el Gateway. Todos comparten el mismo `JWT_SECRET` por env. El Gateway reenvía `x-user-id`/`x-user-email`/`x-user-role` como headers de conveniencia (no se usan todavía downstream); por seguridad, el Gateway los limpia de cualquier request entrante antes de fijarlos él mismo (`stripForwardedIdentityHeaders`), para que un cliente no pueda falsificarlos en rutas públicas.

### Cambio de rol y sincronización Auth ↔ Users
El único endpoint que cambia el `role` de un usuario es `PATCH /api/auth/:authUserId/role` (`ADMIN`, en Auth — no en Users) porque Auth es la fuente que se firma en el JWT. `AuthService.changeRole()` actualiza `AuthUser.role`, publica `EVENTS.USER_ROLE_CHANGED` (Users se suscribe en `apps/users/src/events/events-subscriber.service.ts` y actualiza su copia de `role`) y escribe `auth:role-version:<authUserId>` en Redis con TTL `JWT_EXPIRES_IN`. `JwtStrategy.validate()` (`packages/common/src/strategies/jwt.strategy.ts`) compara ese timestamp contra el `iat` del JWT en **cada** servicio con `JwtAuthGuard` — un JWT firmado antes del cambio se rechaza con 401, forzando a loguear de nuevo. Es fail-open: si Redis no responde, se loguea un warning y el JWT se acepta igual, nunca se bloquea la autenticación por eso. Por esta razón `users`, `storage` y `reports` ahora también tienen `RedisPubSubModule`/`REDIS_URL` conectados aunque no publiquen ni consuman ningún evento propio — lo necesita `JwtStrategy`, no el dominio de esos servicios.

### Llamadas internas entre servicios
Se protegen con `InternalKeyGuard` (en `@minedu/common`) que compara el header `x-internal-key` contra `INTERNAL_API_KEY`. Ya usado en Users, Notifications, Storage, Classroom y Analytics (cada uno con su propio `/internal/*`, consumidos por Auth, AI y Reports según el caso) — lista completa en [`docs/SERVICES.md`](./docs/SERVICES.md). Reusar el mismo guard para nuevos endpoints internos, no duplicarlo.

### Eventos entre servicios (Redis Pub/Sub) y colas (BullMQ)
`@minedu/common` expone `RedisPubSubService` (`publish`/`subscribe` + `set`/`get` genéricos sobre la misma conexión) + `RedisPubSubModule` (importar una vez en `AppModule`, queda `@Global()`) y el catálogo `EVENTS` (`event-names.ts`) — 15 eventos hoy (Auth, Classroom, Analytics, Accessibility). Mapa completo de quién publica/consume cada uno en [`docs/SERVICES.md`](./docs/SERVICES.md#catálogo-de-eventos). Patrón de referencia ya funcionando:
- **Auth publica** `user.created` al registrar y `user.role_changed` al cambiar rol (`apps/auth/src/auth/auth.service.ts`), en un `try/catch` que no bloquea la respuesta si Redis falla.
- **Notifications se suscribe** a `user.created` (`apps/notifications/src/events/events-subscriber.service.ts`) y encola una notificación de bienvenida vía BullMQ (`@nestjs/bullmq`, cola `notifications`), cuyo `NotificationsProcessor` persiste en Postgres y empuja por WebSocket (`NotificationsGateway`, namespace `/notifications`, path `/ws/notifications`, autenticado con el JWT en `handshake.auth.token`).
- **Users se suscribe** a `user.role_changed` (`apps/users/src/events/events-subscriber.service.ts`) para mantener su copia de `role` igual a la de `auth_db`.
- **Classroom publica** 11 eventos (curso/aula/matrícula/asistencia/nota/competencia) desde sus respectivos `*.service.ts`. **Analytics se suscribe** a los de asistencia, nota y competencia (`event-listeners/`) para recalcular indicadores (incluyendo `competencyScore`) y reevaluar riesgo en tiempo real.

Para un evento nuevo: agregar la constante a `EVENTS` en `@minedu/common`, publicar desde el servicio origen, suscribirse desde el/los servicios interesados en su `OnModuleInit`. El WebSocket de Notifications **pasa por el Gateway**: `apps/gateway/src/main.ts` proxya `/ws/notifications` con `http-proxy-middleware` (`ws: true`) enganchado al evento `upgrade` del `http.Server`, hacia `NOTIFICATIONS_SERVICE_URL` (ya no publicado como puerto externo en `docker-compose.yml`). El cliente conecta con `io('http://<gateway>:3000/notifications', { path: '/ws/notifications', auth: { token } })`.

### Llamadas HTTP internas vs. eventos: cuándo usar cada uno
Los eventos son para reacciones asíncronas desacopladas (el publicador no sabe ni le importa quién escucha). Cuando un servicio necesita el dato **ya, de forma síncrona, para construir una respuesta** (ej. Reports/AI necesitan leer aulas+asistencias+notas+riesgo en el momento de generar un reporte), se usa una llamada HTTP a un endpoint `/internal/*` del servicio dueño del dato, protegido con `InternalKeyGuard`. Classroom y Analytics ya exponen varios de estos, consumidos por AI y Reports — ver `docs/SERVICES.md` antes de agregar uno nuevo, es probable que el endpoint que necesitas ya exista.

### bcryptjs, no bcrypt
`bcrypt` (nativo) falla al compilar su binding en este entorno (pnpm + Windows). Se usa `bcryptjs` (puro JS). No reintroducir `bcrypt`.

### Env validation con Joi
Cada servicio valida sus variables de entorno en `src/config/env.validation.ts` con Joi, cargado vía `ConfigModule.forRoot({ isGlobal: true, validationSchema })`. Copiar ese patrón para servicios nuevos en vez de leer `process.env` directo.

### Dockerfile: copiar todo el repo, no `pnpm deploy`
Los Dockerfiles multi-stage copian `/repo` completo del stage de build al de runtime (en vez de `pnpm deploy --prod`) para evitar problemas de symlinks de pnpm rotos entre stages. Es más pesado pero confiable. Ver `apps/auth/Dockerfile` como plantilla si se agrega un servicio nuevo (agregar el bloque de `packages` + `prisma generate` solo si el servicio usa Prisma o `@minedu/common`).

### Prisma en Alpine necesita `openssl` explícito
`node:22-alpine` no trae `libssl` instalado. Sin él, `prisma generate` no puede detectar la versión de OpenSSL y genera un query engine para un target (`openssl-1.1.x`) que no existe en el contenedor — **el build pasa limpio pero el servicio crashea al conectar a la base de datos en runtime** (`PrismaClientInitializationError: Unable to require libquery_engine-linux-musl.so.node`). Todo Dockerfile que use Prisma debe tener `RUN apk add --no-cache openssl` en ambos stages (`build` y `runtime`), justo después de `RUN corepack enable`. Ya aplicado a los 9 Dockerfiles con Prisma — replicar en cualquier servicio nuevo.

### pnpm: versión fijada en el root `package.json`
`"packageManager": "pnpm@10.22.0"`. Sin esto, Corepack resuelve "la última" versión de pnpm en cada build; pnpm 11+ bloquea scripts de postinstall por defecto (`ERR_PNPM_IGNORED_BUILDS`) y rompe el `pnpm install` de cualquier Dockerfile en una máquina que no tenga cacheada la misma versión que el autor original. No cambiar esta versión sin probar el build Docker completo.

## Verificación local

```bash
pnpm install
docker compose up -d postgres redis minio
pnpm --filter auth prisma:migrate
pnpm --filter users prisma:migrate
pnpm --filter storage prisma:migrate
pnpm --filter notifications prisma:migrate
pnpm --filter classroom prisma:migrate
pnpm --filter analytics prisma:migrate
pnpm --filter ai prisma:migrate
pnpm --filter accessibility prisma:migrate
pnpm --filter reports prisma:migrate
pnpm dev:gateway   # y dev:auth, dev:users, etc. en otras terminales
```

Flujos de humo ya verificados funcionando (local y en un despliegue Docker completo en VPS, 2026-07-25):
- `POST /api/auth/register` → `POST /api/auth/login` → `GET /api/users/:id` con Bearer token (self-access ok, roles no autorizados dan 403, sin token da 401 **del Gateway** antes de llegar a Users). Nota: `RegisterDto` pide `fullName` (no `firstName`/`lastName`), y register ya devuelve `{ accessToken, user }` — no hace falta loguear aparte.
- Registro dispara `user.created` → Notifications crea y persiste una notificación de bienvenida, visible en `GET /api/notifications` con el JWT del usuario recién creado.
- Storage: `POST /api/storage/upload` (multipart) → `GET /api/storage/:id` (metadata) → `GET /api/storage/:id/download` (302 a URL prefirmada de MinIO) → `DELETE /api/storage/:id` → `GET` posterior da 404.
- Rate limiter del Gateway responde con headers `RateLimit-*` en cada request.
- Flujo completo Classroom → Analytics → Reports: crear curso + aula, matricular estudiante, registrar asistencia y nota → Analytics recalcula indicador y riesgo por evento → `POST /api/reports/generate` agrega correctamente y sube el CSV a Storage.
- Cambio de rol: `PATCH /api/auth/:authUserId/role` (ADMIN) → `GET /api/users?role=...` refleja el nuevo rol (sync vía `user.role_changed`) → el JWT viejo del usuario afectado da 401 en cualquier endpoint protegido ("Tu sesión expiró porque tu rol cambió") → login de nuevo emite un JWT válido con el rol actualizado. Probado contra el VPS el 2026-07-25.
- WebSocket: `io('http://<gateway>:3000/notifications', { path: '/ws/notifications', auth: { token } })` conecta a través del Gateway (antes requería el puerto 3004 directo) y recibe eventos `notification` en vivo — probado con `socket.io-client` contra el VPS el 2026-07-25.

`docker compose up --build` completo (las 10 imágenes) **sí se validó de punta a punta** en un VPS limpio (Ubuntu 20.04, 1.9GB RAM + 4GB swap) — los 13 contenedores (10 servicios + postgres + redis + minio) quedan estables y el gateway responde externamente. Los tres bugs que bloqueaban esto (pnpm sin pin, openssl faltante, exports de módulo faltantes) están documentados arriba y en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#despliegue-docker) — ya corregidos, no deberían reaparecer si se siguen esas convenciones.
