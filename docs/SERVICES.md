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
- **Proxy de WebSocket**: `/ws/notifications` se proxya con `http-proxy-middleware` (`ws: true`) hacia Notifications, enganchando el evento `upgrade` del `http.Server` subyacente (`apps/gateway/src/main.ts`, después de `app.listen()`). Es un pipe de transporte — no revalida el JWT, eso lo sigue haciendo Notifications en `handleConnection`.

## Auth — puerto 3001, DB `auth_db`

Emite y valida credenciales. **No guarda el perfil del usuario** (eso es responsabilidad de Users).

- `POST /register` — crea `AuthUser`, llama a Users internamente (`UsersClientService` → `POST /internal` en Users) para crear el perfil, publica `user.created`, devuelve `{ accessToken, user }`.
- `POST /login` — `LocalAuthGuard` (Passport local strategy) + devuelve `{ accessToken, user }`.
- `PATCH /:authUserId/role` (`ADMIN`) — único endpoint del sistema que cambia el rol de un usuario. Actualiza `AuthUser.role` (la fuente que se firma en el JWT), publica `user.role_changed` para que Users sincronice su copia, y escribe `auth:role-version:<authUserId>` en Redis (TTL = `JWT_EXPIRES_IN`) para invalidar cualquier JWT emitido antes del cambio — ver [invalidación de sesión](#invalidación-de-sesión-por-cambio-de-rol).
- `POST /internal/register` (`InternalKeyGuard`) — registro interno usado por Classroom al aceptar una invitación de DIRECTIVO→DOCENTE (crea `AuthUser` + perfil de Users, devuelve `{ accessToken, user }`). *Nota*: el `acceptTeacherInvitation` actualmente **no** llama a este endpoint — el docente ya tiene cuenta propia. Este endpoint queda disponible si se necesita en el futuro.
- Depende de: **Users** (interno, síncrono, bloqueante — si Users no responde, el registro falla), **Redis** (pub/sub + versión de rol, no bloqueante — un fallo de Redis no bloquea el registro ni el cambio de rol, solo hace fail-open la invalidación de sesión).
- Publica: `user.created`, `user.role_changed`.
- **Roles (remodelado 2026-07-25)**: `ADMIN | DIRECTIVO | DOCENTE | FAMILIAR`. Ya no existen `ESPECIALISTA` ni `ESTUDIANTE` (el estudiante no es usuario — es un registro `Student` en Classroom, creado por su FAMILIAR). Registrar con un rol viejo devuelve 400 (`@IsEnum(Role)` en `RegisterDto`).
- Hashing con `bcryptjs` (no `bcrypt` nativo — falla al compilar en pnpm+Windows).

## Users — puerto 3002, DB `users_db`

Perfil del usuario, separado de las credenciales.

- `POST /internal` (`InternalKeyGuard`) — crea el perfil (llamado por Auth al registrar).
- `GET /` (ADMIN, DIRECTIVO) — lista paginada.
- `GET /:id` (self o ADMIN/DIRECTIVO) — `assertSelfOrPrivileged` compara `currentUser.sub` contra `user.authUserId`.
- `PATCH /:id` (self o ADMIN/DIRECTIVO) — solo `fullName`, no cambia `role` (eso vive en Auth, ver arriba).
- `DELETE /:id` (ADMIN, DIRECTIVO).
- **Se suscribe** a `user.role_changed` (`events-subscriber.service.ts`, nuevo) → `UsersService.updateRoleByAuthUserId` actualiza su copia de `role` para mantenerla igual a `auth_db`.
- No llama a ningún otro servicio por HTTP.

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
- Se suscribe a `invitation.created` (`events-subscriber.service.ts`) → envía email de invitación vía `EmailService` (Nodemailer SMTP). Template distinto según `type` (docente o familiar).
- Se suscribe a `invitation.accepted` (`events-subscriber.service.ts`) → encola notificación in-app al que creó la invitación.
- **Email transaccional** (`apps/notifications/src/email/`): módulo `EmailModule` con `EmailService` que usa Nodemailer (`SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`). Templates HTML en `apps/notifications/src/email/templates/`:
  - `teacher-invitation.ts` — invitación DIRECTIVO→DOCENTE (asociar a Institución Educativa). Subject: `{institutionName} — te invita a unirte como docente`.
  - `family-invitation.ts` — invitación DOCENTE→FAMILIAR (matricular hijo en un aula). Subject: `{classroomName} — invitación para matricular a tu hijo`.
  - Variables de entorno: `FRONTEND_URL` (base del link de aceptación), `SMTP_*`.
- **WebSocket namespace `/notifications`, path `/ws/notifications`**, autenticado con el JWT en `handshake.auth.token`. El cliente se conecta a través del **Gateway** (`io('http://<gateway-host>:3000/notifications', { path: '/ws/notifications', auth: { token } })`) — el Gateway proxya el `upgrade` hacia `NOTIFICATIONS_SERVICE_URL`, que ya no está publicado directamente (puerto `3004` sin `ports:` en `docker-compose.yml`, solo alcanzable dentro de la red Docker).

## Classroom — puerto 3006, DB `classroom_db`

El dominio operacional principal. **Remodelado 2026-07-25**: Institution (IE, solo DIRECTIVO) → Classroom (aula, DOCENTE) → Course (curso). Estudiantes como registros (`Student`, creados por su FAMILIAR, no usuarios), matrícula por `Enrollment` vía invitaciones por link. Fuente de verdad para Analytics, AI, Reports y Accessibility.

### Institution (`/institutions`)

- CRUD completo, solo `DIRECTIVO` crea y administra IEs.
- `GET /` — `ADMIN` ve todas las IEs; `DIRECTIVO` ve solo las suyas.
- `POST /` (solo `DIRECTIVO`).
- `GET /:id`, `PATCH /:id`, `DELETE /:id` — solo la IE propia (`institutionId` del JWT).
- Publica: `institution.created`, `institution.updated`, `institution.deleted`.

### Classroom (`/classrooms`)

- **`findAll(userRole, userId)`** — filtrado por ownership:
  - `ADMIN`: todas las aulas.
  - `DIRECTIVO`: solo aulas de sus instituciones (`institutionId` match).
  - `DOCENTE`: solo aulas propias (`teacherId` match).
  - `FAMILIAR`: solo aulas donde tiene hijos matriculados (via `Enrollment.student.familiarId`).
- `POST /` — `name` + `gradeLevel` + `institutionId?` (opcional, crear aula independiente).
- `GET /:id`, `PATCH /:id`, `DELETE /:id` — ownership check: `classroom.teacherId === userId` (o `ADMIN`).
- `GET /:id/courses` — cursos del aula.
- Publica: `classroom.created`, `classroom.updated`, `classroom.deleted`.

### Course (`/courses`)

- `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.
- Relación invertida: `classroomId` en el body de creación (Course pertenece a Classroom).
- Publica: `course.created`.

### Grade (`/grades`)

- `POST /` — `studentId` + `courseId` + `score` + `period`. Ownership check: courseId → classroom → teacherId.
- `GET /classroom/:id` — notas por aula (via courses).
- `GET /student/:id` — notas por estudiante.
- `GET /:id`, `PATCH /:id`, `DELETE /:id`.
- FAMILIAR puede leer notas de sus hijos (`/classroom/:id`, `/student/:id`).
- Publica: `grade.registered`, `grade.updated`.

### Competency (`/competencies`)

- `POST /` — `studentId` + `courseId` + `competencyName` + `score` + `period`. Ownership check: courseId → classroom → teacherId.
- `GET /classroom/:id` — competencias por aula.
- `GET /student/:id` — competencias por estudiante.
- `GET /:id`, `PATCH /:id`, `DELETE /:id`.
- FAMILIAR puede leer competencias de sus hijos.
- Publica: `competency.evaluated`.

### Attendance (`/attendance`)

- `POST /` — `studentId` + `classroomId` + `date` + `status` + `notes?`. Ownership check: classroom → teacherId.
- `GET /classroom/:id` — asistencia por aula.
- `GET /student/:id` — asistencia por estudiante.
- `GET /:id`, `PATCH /:id`.
- FAMILIAR puede leer asistencia de sus hijos.
- Publica: `attendance.registered`, `attendance.updated`, `attendance.batch.registered`.

### Enrollment (`/enrollments`)

- Creado automáticamente al aceptar una invitación `FAMILY_TO_CLASSROOM`.
- `GET /classroom/:id` — matrícululas del aula.
- `GET /student/:id` — matrícululas de un estudiante.
- `DELETE /:id` — desmatricular.
- Publica: `enrollment.created`.

### Invitation (`/invitations`)

- `POST /` (DOCENTE) — crear invitación. Body: `{ email, type, classroomId?, institutionId? }`.
  - `TEACHER_TO_INSTITUTION`: asociar un docente a una IE. Email y `institutionId` obligatorios.
  - `FAMILY_TO_CLASSROOM`: matricular un hijo en un aula. Email y `classroomId` obligatorios.
- `GET /` — listar invitaciones propias.
- `GET /token/:token` (**público**, sin JWT) — ver detalles de la invitación desde el link del email.
- `POST /accept/teacher` (**público**, sin JWT) — aceptar invitación docente. El docente ya tiene cuenta; solo se crea `InstitutionTeacher` y se importan aulas independientes. Verifica que el JWT coincida con el email de la invitación (pendiente — ver PENDING).
- `POST /accept/family` (JWT) — aceptar invitación familiar. Body: `{ token, studentId }` — crea `Enrollment`.
- `POST /revoke/:id` (JWT) — revocar invitación.
- Publica: `invitation.created`, `invitation.accepted`.

### Student (`/students`)

- `POST /` (FAMILIAR) — registrar un hijo. Body: `{ name, birthDate?, dni?, familiarId, supportNeeds? }`.
  - `supportNeeds`: array opcional `[{ type: SupportNeedType, level: SupportLevel, description? }]`.
- `GET /familiar/:familiarId` (FAMILIAR) — hijos de un familiar.
- `GET /:id` — datos del estudiante.
- `PATCH /:id` (FAMILIAR) — actualizar datos del hijo.
- `DELETE /:id` (FAMILIAR) — eliminar registro de estudiante.
- Publica: `student.created`.

### Support Need (`/support-needs`)

- CRUD para necesidades de apoyo de un estudiante (opcional, vinculado a `Student`).
- `POST /`, `GET /student/:studentId`, `GET /:id`, `PATCH /:id`, `DELETE /:id`.

### Internal (`/internal`)

- `GET /classrooms` — todas las aulas (con `courses` y `enrollments: { include: { student: true } }`).
- `GET /classroom/:id` — una aula con sus cursos y matrículas.
- `GET /classroom/:id/attendances` — asistencias del aula.
- `GET /classroom/:id/grades` — notas del aula (via courses).
- `GET /courses/classroom/:id` — cursos de un aula.
- `GET /enrollments/classroom/:id` — matrícululas de un aula.
- `GET /students/familiar/:familiarId` — hijos de un familiar.
- `GET /support-needs/student/:studentId` — necesidades de apoyo de un estudiante.
- Todos protegidos con `InternalKeyGuard`.

Publica 19 eventos (catálogo abajo).

## Analytics ("Gemelo Digital") — puerto 3007, DB `analytics_db`

No expone escritura pública — se recalcula reactivamente a partir de eventos de Classroom.

- `IndicatorsController` (`/indicators`) — `GET /indicators/classroom/:id`, `GET /indicators/student/:id/classroom/:id`, `GET /indicators/student/:id`.
- `DigitalTwinController` (`/digital-twin`) — vista agregada por aula o por estudiante (`GET /digital-twin/classroom/:id`, `GET /digital-twin/classroom/:id/student/:id`).
- `RecommendationController` (`/recommendations`) — lectura + `PATCH /recommendations/:id/dismiss`.
- `InternalController` (`/internal`, `InternalKeyGuard`) — `GET /internal/indicators/classroom/:id`, `GET /internal/risk/classroom/:id`, `GET /internal/recommendations/classroom/:id`. **Consumido por AI y Reports.**
- **Se suscribe** a `attendance.registered`/`attendance.updated` (`attendance-events.listener.ts`), `grade.registered`/`grade.updated` (`grade-events.listener.ts`) y `competency.evaluated` (`competency-events.listener.ts`) → recalcula `StudentIndicator` (incluyendo `competencyScore`/`competencyCount`) → reevalúa `RiskAssessment` (`risk.service.ts`, reglas en `risk.rules.ts`, que ahora incluyen umbral de competencia) → si corresponde, genera `Recommendation` (`recommendation.rules.ts`).
- Publica `risk.detected` cuando `risk.service.ts` sube el nivel de riesgo de un estudiante.
- Depende de Classroom solo indirectamente (vía eventos, no HTTP).

## AI — puerto 3008, DB `ai_db`

Reporte PDF semanal **de una sola aula**, generado bajo demanda o por cron.

- `ReportController` (`/reports`) — `POST /reports/generate` (body `{ classroomId, weekStart, weekEnd }`) → agrega asistencia+notas+indicadores+riesgo de esa aula/semana, calcula `anomalies` por estudiante (riesgo != `NONE`, `attendanceRate < 0.8`, `avgGrade < 11`), genera PDF (`pdfkit`, incluye sección "Anomalías Detectadas"), lo sube a Storage, y devuelve `{ report, attendanceSummary, gradeSummary, anomalies }` (no solo el registro `Report`); `POST /reports/generate/pdf` (mismo cálculo, devuelve el binario PDF directo); `GET /reports`, `GET /reports/:id`.
- `ScheduleService` (`@nestjs/schedule`, cron semanal) — recorre todas las aulas (`GET /internal/classrooms` en Classroom) y genera el reporte de cada una automáticamente.
- Depende de (HTTP interno, síncrono): **Classroom** (aula, asistencias, notas), **Analytics** (indicadores, riesgo), **Storage** (subir el PDF).
- No publica eventos.
- **Ver [distinción con Reports](#ai-vs-reports) más abajo.**

## Accessibility — puerto 3009, DB `accessibility_db`

Pipeline de accesibilidad para material educativo: OCR → adaptación de texto → subtítulos → pictogramas → texto-a-voz.

- `AccessibilityController` (`@Controller()` vacío) — `POST /process` (body `{ fileId, fileName, fileType, adaptationLevel }`), `POST /process/audio` (mismo pipeline, devuelve el audio directo como `audio/mpeg`/`.mp3`), `POST /process/worksheet` (agregado 2026-07-25, ver abajo), `GET /jobs`, `GET /jobs/:id`.
- Pipeline base (`pipeline.service.ts`, método `process`): descarga el archivo de Storage (interno) → `OcrService` (`tesseract.js`, solo si el mimetype lo requiere) → `AdaptationService` (Groq, `llama-3.3-70b-versatile` vía el SDK de `openai` apuntando a `https://api.groq.com/openai/v1`: lectura fácil + resumen) → `AudioService` (ElevenLabs, SDK `@elevenlabs/elevenlabs-js`, modelo `eleven_multilingual_v2`, voz configurable vía `ELEVENLABS_VOICE_ID` — genera mp3) → **sube audio a Storage** (`audio-{id}.mp3`, `audio/mpeg`, `POST /internal/upload` base64 JSON) → **genera SRT** (`srt.util.ts`, timestamps proporcionales basados en una duración estimada por velocidad de habla — `estimateSpeechDuration`, ~15 caracteres/segundo, no depende del formato del audio) y lo sube a Storage → **consulta ARASAAC** (`pictogram.service.ts`, API pública `GET /api/pictograms/es/search/{keyword}`, hasta 10 keywords más frecuentes del texto adaptado, excluyendo stop words en español) → persiste `AccessibilityJob` con `audioFileId`, `subtitlesFileId` y `pictogramData` poblados → publica `accessibility.pipeline.completed`.
- **Fichas didácticas** (`processWorksheet`, agregado 2026-07-25 para el desafío de Educación Básica Especial de la Categoría A — ver `docs/hackathon-bases-2026.pdf`): reusa el pipeline base para obtener `adaptedText`+`pictogramData`, y si el request trae `studentId` consulta `GET /internal/support-needs/student/:studentId` en Classroom (`CLASSROOM_SERVICE_INTERNAL_URL`, fail-open — si Classroom no responde la ficha igual se genera, sin personalizar). Le pide a `AdaptationService.generateWorksheet()` (Groq, prompt distinto al de lectura fácil) reestructurar el texto en una ficha JSON (`{title, instructions, exercises[]}`, tipos `opcion_multiple`/`verdadero_falso`/`completar`) — si hay necesidades de apoyo registradas, el prompt agrega una guía por tipo (`SUPPORT_NEED_GUIDANCE` en `adaptation.service.ts`, ej. TEA → instrucciones literales sin lenguaje figurado). `worksheet-pdf.util.ts` maquetea el resultado con `pdfkit` (título, palabras clave con imágenes de pictogramas, ejercicios con espacio de respuesta) y lo sube a Storage. Persiste `worksheetFileId`/`worksheetContent` en el mismo `AccessibilityJob`.
- Depende de: **Storage** (interno, descarga + upload), **Classroom** (interno, solo para `process/worksheet` con `studentId`, opcional/fail-open), **Groq** (API externa, requiere `GROQ_API_KEY` real — sin ella el servicio no arranca, Joi la exige), **ElevenLabs** (API externa, requiere `ELEVENLABS_API_KEY` real — sin ella el servicio no arranca, Joi la exige), **ARASAAC** (API pública, no requiere key, fallback silencioso si falla).
- Publica `accessibility.pipeline.completed`. Nadie se suscribe a este evento todavía.

## Reports — puerto 3005, DB `reports_db`

Reportes **institucionales agregados, multi-aula**, para `ADMIN`/`DIRECTIVO`. Implementado 2026-07-25 (antes era un stub). PDF + cron agregados 2026-07-25. Reportes por aula/estudiante agregados 2026-07-25.

**Reporte institucional** (solo `ADMIN`/`DIRECTIVO`):
- `POST /generate` (body `{ gradeLevel?, courseId?, periodStart, periodEnd }`) genera CSV+PDF; `POST /generate/pdf` devuelve el binario PDF directo; `GET /`, `GET /:id`, `GET /:id/download` (302 a Storage para CSV), `GET /:id/download/pdf` (302 a Storage para PDF).
- `ScheduleService` (`@nestjs/schedule`, cron semanal) genera un reporte automático sin filtros (todas las aulas, últimos 7 días, `generatedBy: 'system'`).

**Reporte por aula** (`ADMIN`/`DIRECTIVO`/`DOCENTE`):
- `POST /generate/classroom` (body `{ classroomId, periodStart, periodEnd }`) — genera PDF on-demand con asistencia/promedio/riesgo por estudiante del aula en el periodo. No persiste en DB.

**Reporte por estudiante** (`ADMIN`/`DIRECTIVO`/`DOCENTE`):
- `POST /generate/student` (body `{ studentId, classroomId, periodStart, periodEnd }`) — genera PDF on-demand con asistencia, calificaciones, competencia, riesgo y recomendaciones del estudiante en el periodo. No persiste en DB.

Los reportes por aula/estudiante reutilizan los mismos endpoints internos de Classroom/Analytics (`/internal/classroom/:id`, `/attendances`, `/grades`, `/internal/indicators/classroom/:id`, `/internal/risk/classroom/:id`, `/internal/recommendations/classroom/:id`). El controlador usa `@Roles()` por endpoint (no a nivel de clase) para mezclar `ADMIN`/`DIRECTIVO` en los endpoints institucionales y `ADMIN`/`DIRECTIVO`/`DOCENTE` en los de aula/estudiante.

### AI vs Reports

Coexisten a propósito, con alcance distinto — si tocas la lógica de agregación en uno, revisa si el cambio también aplica al otro (misma fuente de datos):

| | AI (`/api/ai/reports`) | Reports (`/api/reports`) |
|---|---|---|
| Alcance | **1 aula** por reporte | **N aulas** (institucional), **1 aula**, **1 estudiante** |
| Quién lo pide | `DOCENTE`, `ADMIN`, `DIRECTIVO` | Institucional: `ADMIN`, `DIRECTIVO`. Aula/Estudiante: `ADMIN`, `DIRECTIVO`, `DOCENTE` |
| Salida | PDF (`pdfkit`) | CSV + PDF (`pdfkit`) institucional; PDF on-demand por aula/estudiante |
| Automatización | cron semanal (`ScheduleService`) | cron semanal (`ScheduleService`) — solo institucional |
| Persistencia | DB `ai_db` + Storage | DB `reports_db` + Storage (institucional); on-demand sin persistir (aula/estudiante) |
| Caso de uso | "reporte de mi aula esta semana" (docente) | "estado general del colegio" (dirección), "detalle de mi aula" (docente), "detalle de un estudiante" (docente) |

## Catálogo de eventos

Definidos en `packages/common/src/events/event-names.ts` (`EVENTS`). Los 19 están todos publicados por al menos un servicio; todos tienen al menos un subscriber activo excepto `attendance.batch.registered`, `risk.detected`, `accessibility.pipeline.completed`, `institution.created`, `institution.updated`, `institution.deleted`, `course.created`, `classroom.created`, `classroom.updated`, `classroom.deleted`, `student.created` y `student.unenrolled`.

| Evento | Publica | Se suscribe |
|---|---|---|
| `user.created` | Auth | Notifications (notificación de bienvenida) |
| `user.role_changed` | Auth | Users (sincroniza su copia de `role`) |
| `institution.created` | Classroom | — |
| `institution.updated` | Classroom | — |
| `institution.deleted` | Classroom | — |
| `course.created` | Classroom | — |
| `classroom.created` | Classroom | — |
| `classroom.updated` | Classroom | — |
| `classroom.deleted` | Classroom | — |
| `student.created` | Classroom | — |
| `student.unenrolled` | Classroom | — |
| `enrollment.created` | Classroom | — |
| `invitation.created` | Classroom | Notifications (envía email de invitación) |
| `invitation.accepted` | Classroom | Notifications (notificación in-app al creador) |
| `attendance.registered` | Classroom | Analytics (recalcula indicador + riesgo) |
| `attendance.updated` | Classroom | Analytics (recalcula indicador + riesgo) |
| `attendance.batch.registered` | Classroom | — |
| `grade.registered` | Classroom | Analytics (recalcula indicador + riesgo) |
| `grade.updated` | Classroom | Analytics (recalcula indicador + riesgo) |
| `competency.evaluated` | Classroom | Analytics (recalcula competencyScore + riesgo) |
| `risk.detected` | Analytics | — |
| `accessibility.pipeline.completed` | Accessibility | — |

## Invalidación de sesión por cambio de rol

`JwtStrategy.validate()` (`packages/common/src/strategies/jwt.strategy.ts`) compara el `iat` (issued-at) del JWT contra `auth:role-version:<authUserId>` en Redis (escrito por Auth en `changeRole()`, ver arriba). Si el token fue firmado antes del último cambio de rol, se rechaza con 401 — el usuario debe volver a loguear para obtener un JWT con el rol nuevo. Corre en **todo** servicio con `JwtAuthGuard` (no solo en el Gateway), consistente con el resto del sistema donde cada servicio valida el JWT de forma independiente. **Fail-open**: si Redis no responde, se loguea un warning y el JWT se acepta igual — Redis nunca es una dependencia dura para autenticarse. La clave tiene TTL = `JWT_EXPIRES_IN`, así que no crece indefinidamente (pasado ese tiempo todos los tokens pre-cambio ya expiraron solos).

Por esto, `users`, `storage` y `reports` (que antes no tenían Redis conectado) ahora importan `RedisPubSubModule` y requieren `REDIS_URL` — necesario para que su `JwtStrategy` pueda hacer el chequeo, aunque esos tres servicios no publiquen ni consuman ningún evento propio.

## Guards y utilidades compartidas (`@minedu/common`)

`Role`, `JwtPayload`, `JwtAuthGuard` + `JwtStrategy` (Passport, ahora inyecta `RedisPubSubService` para el chequeo de arriba), `RolesGuard` + `@Roles()`, `@CurrentUser()`, `InternalKeyGuard`, `HttpExceptionFilter`, `PaginationDto`, `RedisPubSubService` (incluye `publish`/`subscribe` y `set`/`get` genéricos) + `RedisPubSubModule` (`@Global()`), `EVENTS`. Se compila a `dist/` y se consume como paquete normal de `node_modules` — **hay que correr `pnpm --filter @minedu/common build` después de tocar `packages/common/src`** antes de que el resto de servicios vea el cambio (dev o build/Docker).
