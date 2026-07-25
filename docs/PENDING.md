# Pendientes

Última actualización: 2026-07-25 (post-refactor completo: IE/roles/invitaciones + código adaptado).

## ✅ Refactor IE/roles: adaptación de código completada

El 2026-07-25 se remodeló el dominio a nivel de BD y el código de aplicación fue adaptado. Los 10 servicios compilan limpiamente (`nest build` sin errores).

### Completado

- [x] `@minedu/common` — 4 eventos nuevos: `invitation.created`, `invitation.accepted`, `student.created`, `enrollment.created`
- [x] `apps/classroom/src/classroom/*` — eliminados `enroll`/`unenroll` (reemplazados por Invitation+Enrollment), fix `include: { courses: true }` (plural), DTOs actualizados (`name`, `gradeLevel`, `institutionId?`)
- [x] `apps/classroom/src/course/*` — fix `include: { classroom: true }` (singular), DTOs: `name` + `classroomId` (relación invertida)
- [x] `apps/classroom/src/grade/*` — `classroomId` → `courseId` en DTOs y service, `findByClassroom` usa `course.classroomId`
- [x] `apps/classroom/src/competency/*` — `classroomId` → `courseId`, payload de evento incluye `classroomId` resuelto via `Course`
- [x] `apps/classroom/src/attendance/*` — validación de `Enrollment` antes de crear asistencia
- [x] `apps/classroom/src/support-need/support-need.controller.ts` — `ESPECIALISTA` → `FAMILIAR`/`DOCENTE`
- [x] `apps/classroom/src/internal/internal.controller.ts` — fixes de relation names + nuevos endpoints (`/enrollments`, `/students/familiar/:familiarId`)
- [x] **Módulo Institution** — CRUD, solo `DIRECTIVO` crea/administra IEs
- [x] **Módulo Invitation** — crear/aceptar/revocar invitaciones (teacher + family), aceptación crea AuthUser vía endpoint interno de Auth
- [x] **Módulo Student** — CRUD para `FAMILIAR` registrar hijos (con `StudentSupportNeed` opcionales)
- [x] **Auth endpoint interno** — `POST /internal/register` para que Classroom pueda crear usuarios al aceptar invitaciones docente
- [x] **Módulo Email en Notifications** — Nodemailer con templates HTML para invitaciones docente y familiar
- [x] **EventsSubscriberService** — suscrito a `invitation.created` (envía email) e `invitation.accepted` (notificación in-app)
- [x] `apps/accessibility/src/accessibility.controller.ts` — `ESPECIALISTA` eliminado de todos los guards
- [x] `apps/analytics/src/**/` — `ESPECIALISTA`/`ESTUDIANTE` eliminados, `FAMILIAR` agregado donde aplica
- [x] `apps/ai/src/report/report.service.ts` — `studentIds` → `enrollments`, fix `course` → `courses`
- [x] `apps/reports/src/report/report.service.ts` — mismos cambios que AI
- [x] Schema `Invitation` — campo `email` agregado (necesario para envío de invitaciones)
- [x] Migración SQL `20260725200000_add_email_to_invitation` — `ALTER TABLE "Invitation" ADD COLUMN "email" TEXT NOT NULL DEFAULT ''`
- [x] Tests actualizados (`test/helpers.ts`, `test/e2e.smoke.spec.ts`, `test/classroom.integration.spec.ts`, `test/ai.integration.spec.ts`, `test/accessibility.integration.spec.ts`) — roles y DTOs adaptados al nuevo modelo
- [x] Env vars configuradas: `.env` root + `apps/classroom/.env` + `apps/notifications/.env` con SMTP (Gmail de yeimi.varela@utec.edu.pe) y AUTH_SERVICE_INTERNAL_URL
- [x] `docker-compose.yml` actualizado: classroom tiene `AUTH_SERVICE_INTERNAL_URL`, notifications tiene SMTP vars
- [x] Todos los servicios Prisma client regenerados y builds exitosos

### Pendiente (no bloqueante)

- (none)

### Env vars nuevas (agregar al `.env`)

```
# Classroom (para llamada interna a Auth)
AUTH_SERVICE_INTERNAL_URL=http://auth:3001

# Notifications (para Nodemailer)
SMTP_HOST=tu.smtp.host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-usuario
SMTP_PASS=tu-password
SMTP_FROM=noreply@minedu.edu.pe
FRONTEND_URL=http://localhost:3000
```

---

Lo que sigue es el snapshot histórico de pendientes previos al remodelado. Ver [ARCHITECTURE.md](./ARCHITECTURE.md), [SERVICES.md](./SERVICES.md) y [DATABASE.md](./DATABASE.md) para el estado completo del sistema.

## Funcionalidad incompleta dentro de servicios ya implementados

- [x] **Accessibility no persiste `audioFileId`/`subtitlesFileId`/`pictogramData`.** Resuelto 2026-07-25.
- [x] **Evento `competency.evaluated` sin consumidor.** Resuelto 2026-07-25.
- [x] ~~Rol duplicado entre Auth y Users sin sincronización.~~ Resuelto 2026-07-25.

## Infraestructura / plataforma

- [x] ~~WebSocket de Notifications no pasa por el Gateway.~~ Resuelto 2026-07-25.
- [ ] **Sin CI/CD.**
- [ ] **Sin tests unitarios.**

## Soluciones "de hackathon", no de producción

- [ ] **Todo el stack corre en HTTP plano, sin TLS.**
- [x] ~~`espeak-ng` como TTS es funcional pero de calidad robótica.~~ Resuelto 2026-07-25 (ElevenLabs).
- [x] ~~Reports (CSV) no tiene versión PDF ni generación automática por cron.~~ Resuelto 2026-07-25.

## Decisiones ya tomadas (no reabrir sin razón)

- **Reports vs AI**: coexisten a propósito, alcance distinto (multi-aula agregado vs. una sola aula).
- **Accessibility usa Groq (no OpenAI)** para adaptación de texto.
- **Accessibility usa ElevenLabs (no espeak-ng)** para texto-a-voz.
- **`MINIO_ENDPOINT` es configurable por env**, default `minio` (interno).
- **Cambio de rol vive en Auth, no en Users** — Auth es la fuente que se firma en el JWT.
- **Fichas didácticas se acoplan a Accessibility**, no son un módulo nuevo.
- **Invitaciones de docente crean la cuenta** — el DOCENTE no tiene cuenta previa; la invitación genera AuthUser + InstitutionTeacher + JWT.
- **Email transaccional en Notifications** — Nodemailer con SMTP configurable, no un microservicio separado.
- **Un FAMILIAR puede tener varios hijos** — registra cada uno vía `POST /api/classroom/students`; cada invitación `FAMILY_TO_CLASSROOM` matricula **1 hijo** (constraint `@@unique([classroomId, studentId])`).
