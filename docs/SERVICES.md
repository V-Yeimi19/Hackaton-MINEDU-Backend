# Servicios

Ficha por servicio. "Endpoints públicos" son los que el Gateway proxya bajo `/api/<servicio>/...`; "Endpoints internos" solo son alcanzables servicio-a-servicio con `x-internal-key`.

## Gateway — puerto 3000

Único punto de entrada HTTP. No tiene base de datos.

- `apps/gateway/src/common/middleware/jwt-check.middleware.ts` — valida JWT con `jsonwebtoken` (no Passport), 401 si falta/inválido y el prefix no es público.
- `apps/gateway/src/common/middleware/strip-identity-headers.middleware.ts` — limpia `x-user-id`/`x-user-email`/`x-user-role` de cualquier request entrante antes de que el Gateway los vuelva a fijar él mismo (anti-spoofing).
- `apps/gateway/src/common/middleware/request-logger.middleware.ts`.
- `apps/gateway/src/config/services.config.ts` — tabla de ruteo: 9 entradas (`auth` público, el resto requiere JWT).
- Rate limiting con headers `RateLimit-*`.
- `GET /api/health` — health check propio.

## Auth — puerto 3001, DB `auth_db`

Emite y valida credenciales. **No guarda el perfil del usuario** (eso es responsabilidad de Users).

- `POST /register` — crea `AuthUser`, llama a Users internamente (`UsersClientService` → `POST /internal` en Users) para crear el perfil, publica `user.created`, devuelve `{ accessToken, user }`.
- `POST /login` — `LocalAuthGuard` (Passport local strategy) + devuelve `{ accessToken, user }`.
- Depende de: **Users** (interno, síncrono, bloqueante — si Users no responde, el registro falla), **Redis** (pub/sub, no bloqueante — el registro no falla si Redis cae).
- Publica: `user.created`.
- Hashing con `bcryptjs` (no `bcrypt` nativo — falla al compilar en pnpm+Windows).

## Users — puerto 3002, DB `users_db`

Perfil del usuario, separado de las credenciales.

- `POST /internal` (`InternalKeyGuard`) — crea el perfil (llamado por Auth al registrar).
- `GET /` (ADMIN, DIRECTIVO) — lista paginada.
- `GET /:id` (self o ADMIN/DIRECTIVO) — `assertSelfOrPrivileged` compara `currentUser.sub` contra `user.authUserId`.
- `PATCH /:id` (self o ADMIN/DIRECTIVO).
- `DELETE /:id` (ADMIN, DIRECTIVO).
- No depende de ningún otro servicio ni publica eventos.

## Storage — puerto 3003, DB `storage_db`, + MinIO

Guarda archivos binarios (subidos por usuarios o generados por otros servicios: PDFs de AI, CSVs de Reports).

- `POST /upload` (multipart, JWT) — sube a MinIO, guarda metadata.
- `GET /` (JWT) — lista archivos del usuario autenticado.
- `GET /:id` (self o ADMIN/DIRECTIVO).
- `GET /:id/download` (self o ADMIN/DIRECTIVO) — 302 a URL prefirmada de MinIO.
- `DELETE /:id`.
- **Internos** (`InternalKeyGuard`, usados por AI y Reports para subir/leer archivos sin dueño de usuario):
  - `POST /internal/upload` — body `{ buffer: base64, originalName, mimeType }`.
  - `GET /internal/:id` — metadata.
  - `GET /internal/:id/download-url` — `{ url }` prefirmada.
- No depende de otros servicios ni publica eventos.
- **Nota conocida**: la URL prefirmada usa el hostname interno de Docker (`MINIO_ENDPOINT=minio`) — funciona para llamadas dentro de la red Docker, pero un cliente externo (navegador) que reciba el 302 no podrá resolver `minio:9000`. Pendiente si se necesita descarga pública desde fuera del VPS.

## Notifications — puerto 3004, DB `notifications_db`, + Redis (BullMQ) + WebSocket

- `POST /internal` (`InternalKeyGuard`) — cualquier servicio puede encolar una notificación para un usuario.
- `GET /` (JWT) — notificaciones del usuario autenticado.
- `PATCH /:id/read` (JWT).
- Se suscribe a `user.created` (`events-subscriber.service.ts`) → encola notificación de bienvenida vía BullMQ (cola `notifications`) → `NotificationsProcessor` persiste en Postgres y empuja por WebSocket.
- **WebSocket namespace `/notifications`**, autenticado con el JWT en `handshake.auth.token`. El cliente se conecta **directo a `NOTIFICATIONS_SERVICE_URL`, no pasa por el Gateway** (no hay proxy de upgrade requests todavía).

## Classroom — puerto 3006, DB `classroom_db`

El dominio operacional principal: cursos, aulas, asistencia, notas, competencias. Fuente de verdad para Analytics, AI y Reports.

Controladores (todos requieren JWT + rol):

- `CourseController` (`/courses`) — CRUD, `DOCENTE`/`ADMIN` para escritura.
- `ClassroomController` (`/classrooms`) — CRUD + `POST /classrooms/enroll` y `POST /classrooms/unenroll` (rol `ESTUDIANTE`, se auto-matricula con su propio `sub`).
- `AttendanceController` (`/attendance`) — `POST /attendance` recibe un batch (`{ classroomId, date, records: [{studentId, status}] }`), `GET /attendance/classroom/:id`, `GET /attendance/student/:id`, `PATCH /attendance/:id`.
- `GradeController` (`/grades`) — CRUD, `GET /grades/classroom/:id`, `GET /grades/student/:id`.
- `CompetencyController` (`/competencies`) — CRUD + `POST /competencies/evaluate`.
- `InternalController` (`/internal`, `InternalKeyGuard`) — `GET /internal/classroom/:id` (con curso), `GET /internal/classroom/:id/attendances`, `GET /internal/classroom/:id/grades`, `GET /internal/classrooms` (todas), `GET /internal/courses`. **Consumido por AI y Reports.**

No depende de ningún otro servicio para escribir (es la fuente). Publica 11 eventos (ver catálogo abajo) desde `course.service.ts`, `classroom.services.ts`, `attendance.services.ts`, `grade.service.ts`, `competency.service.ts`.

## Analytics ("Gemelo Digital") — puerto 3007, DB `analytics_db`

No expone escritura pública — se recalcula reactivamente a partir de eventos de Classroom.

- `IndicatorsController` (`/indicators`) — `GET /indicators/classroom/:id`, `GET /indicators/student/:id/classroom/:id`, `GET /indicators/student/:id` (accesible también por el propio `ESTUDIANTE`).
- `DigitalTwinController` (`/digital-twin`) — vista agregada por aula o por estudiante (`GET /digital-twin/classroom/:id`, `GET /digital-twin/classroom/:id/student/:id`).
- `RecommendationController` (`/recommendations`) — lectura + `PATCH /recommendations/:id/dismiss`.
- `InternalController` (`/internal`, `InternalKeyGuard`) — `GET /internal/indicators/classroom/:id`, `GET /internal/risk/classroom/:id`, `GET /internal/recommendations/classroom/:id`. **Consumido por AI y Reports.**
- **Se suscribe** a `attendance.registered`/`attendance.updated` (`attendance-events.listener.ts`) y `grade.registered`/`grade.updated` (`grade-events.listener.ts`) → recalcula `StudentIndicator` → reevalúa `RiskAssessment` (`risk.service.ts`, reglas en `risk.rules.ts`) → si corresponde, genera `Recommendation` (`recommendation.rules.ts`).
- Publica `risk.detected` cuando `risk.service.ts` sube el nivel de riesgo de un estudiante.
- Depende de Classroom solo indirectamente (vía eventos, no HTTP).

## AI — puerto 3008, DB `ai_db`

Reporte PDF semanal **de una sola aula**, generado bajo demanda o por cron.

- `ReportController` (`/reports`) — `POST /reports/generate` (body `{ classroomId, weekStart, weekEnd }`) → agrega asistencia+notas+indicadores+riesgo de esa aula/semana, genera PDF (`pdfkit`), lo sube a Storage; `POST /reports/generate/pdf` (mismo cálculo, devuelve el binario PDF directo); `GET /reports`, `GET /reports/:id`.
- `ScheduleService` (`@nestjs/schedule`, cron semanal) — recorre todas las aulas (`GET /internal/classrooms` en Classroom) y genera el reporte de cada una automáticamente.
- Depende de (HTTP interno, síncrono): **Classroom** (aula, asistencias, notas), **Analytics** (indicadores, riesgo), **Storage** (subir el PDF).
- No publica eventos.
- **Ver [distinción con Reports](#ai-vs-reports) más abajo.**

## Accessibility — puerto 3009, DB `accessibility_db`

Pipeline de accesibilidad para material educativo: OCR → adaptación de texto → texto-a-voz.

- `AccessibilityController` (`@Controller()` vacío) — `POST /process` (body `{ fileId, fileName, fileType, adaptationLevel }`), `POST /process/audio` (mismo pipeline, devuelve el audio directo), `GET /jobs`, `GET /jobs/:id`.
- Pipeline (`pipeline.service.ts`): descarga el archivo de Storage (interno) → `OcrService` (`tesseract.js`, solo si el mimetype lo requiere) → `AdaptationService` (OpenAI: lectura fácil + resumen) → `AudioService` (texto-a-voz) → persiste `AccessibilityJob` → publica `accessibility.pipeline.completed`.
- Depende de: **Storage** (interno, descarga), **OpenAI** (API externa, requiere `OPENAI_API_KEY` real — con una key placeholder el servicio arranca pero el paso de adaptación fallará).
- Publica `accessibility.pipeline.completed`. Nadie se suscribe a este evento todavía.

## Reports — puerto 3005, DB `reports_db`

Reportes **institucionales agregados, multi-aula**, para `ADMIN`/`DIRECTIVO`. Implementado 2026-07-25 (antes era un stub).

- `ReportController` (`@Controller()` vacío, todo bajo rol `ADMIN`/`DIRECTIVO`) — `POST /generate` (body `{ gradeLevel?, courseId?, periodStart, periodEnd }`), `GET /`, `GET /:id`, `GET /:id/download` (302 a Storage).
- `generateReport`: pide todas las aulas a Classroom (filtradas por `gradeLevel`/`courseId` si se pasan), para cada una trae asistencias+notas del periodo y riesgo actual de Analytics, calcula tasa de asistencia y promedio institucional + distribución de riesgo, arma un CSV, lo sube a Storage.
- Depende de (HTTP interno, síncrono): **Classroom**, **Analytics**, **Storage** — los mismos tres que AI, reutilizando exactamente los mismos endpoints internos.
- No publica eventos.

### AI vs Reports

Coexisten a propósito, con alcance distinto — si tocas la lógica de agregación en uno, revisa si el cambio también aplica al otro (misma fuente de datos):

| | AI (`/api/ai/reports`) | Reports (`/api/reports`) |
|---|---|---|
| Alcance | **1 aula** por reporte | **N aulas** (todas, o filtradas por grado/curso) |
| Quién lo pide | `DOCENTE`, `ADMIN`, `DIRECTIVO` | solo `ADMIN`, `DIRECTIVO` |
| Salida | PDF (`pdfkit`) | CSV |
| Automatización | cron semanal (`ScheduleService`) | solo bajo demanda |
| Caso de uso | "reporte de mi aula esta semana" (docente) | "estado general del colegio este mes" (dirección) |

## Catálogo de eventos

Definidos en `packages/common/src/events/event-names.ts` (`EVENTS`). Los 14 están todos publicados por al menos un servicio; solo `user.created` y los de asistencia/nota tienen un suscriptor activo hoy — `competency.evaluated` se publica pero nadie lo consume todavía (posible extensión futura).

| Evento | Publica | Se suscribe |
|---|---|---|
| `user.created` | Auth | Notifications (notificación de bienvenida) |
| `course.created` | Classroom | — |
| `classroom.created` | Classroom | — |
| `classroom.updated` | Classroom | — |
| `student.enrolled` | Classroom | — |
| `student.unenrolled` | Classroom | — |
| `attendance.registered` | Classroom | Analytics (recalcula indicador + riesgo) |
| `attendance.updated` | Classroom | Analytics (recalcula indicador + riesgo) |
| `attendance.batch.registered` | Classroom | — |
| `grade.registered` | Classroom | Analytics (recalcula indicador + riesgo) |
| `grade.updated` | Classroom | Analytics (recalcula indicador + riesgo) |
| `competency.evaluated` | Classroom | — |
| `risk.detected` | Analytics | — |
| `accessibility.pipeline.completed` | Accessibility | — |

## Guards y utilidades compartidas (`@minedu/common`)

`Role`, `JwtPayload`, `JwtAuthGuard` + `JwtStrategy` (Passport), `RolesGuard` + `@Roles()`, `@CurrentUser()`, `InternalKeyGuard`, `HttpExceptionFilter`, `PaginationDto`, `RedisPubSubService` + `RedisPubSubModule` (`@Global()`), `EVENTS`. Se compila a `dist/` y se consume como paquete normal de `node_modules` — **hay que correr `pnpm --filter @minedu/common build` después de tocar `packages/common/src`** antes de que el resto de servicios vea el cambio (dev o build/Docker).
