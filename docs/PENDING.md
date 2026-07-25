# Pendientes

Última actualización: 2026-07-25 (post-auditoría completa de ownership).

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
- [x] `apps/classroom/src/internal/internal.controller.ts` — fixes de relation names + nuevos endpoints (`/enrollments`, `/students/familiar/:familiarId`) + enrollments en include
- [x] **Módulo Institution** — CRUD, solo `DIRECTIVO` crea/administra IEs. ADMIN ve todas.
- [x] **Módulo Invitation** — crear/aceptar/revocar invitaciones (teacher + family)
- [x] **Módulo Student** — CRUD para `FAMILIAR` registrar hijos (con `StudentSupportNeed` opcionales)
- [x] **Módulo Email en Notifications** — Nodemailer con templates HTML para invitaciones docente y familiar
- [x] **EventsSubscriberService** — suscrito a `invitation.created` (envía email) e `invitation.accepted` (notificación in-app)
- [x] `apps/accessibility/src/accessibility.controller.ts` — `ESPECIALISTA` eliminado de todos los guards
- [x] `apps/analytics/src/**/` — `ESPECIALISTA`/`ESTUDIANTE` eliminados, `FAMILIAR` agregado donde aplica
- [x] `apps/ai/src/report/report.service.ts` — `studentIds` → `enrollments`, fix `course` → `courses`
- [x] `apps/reports/src/report/report.service.ts` — mismos cambios que AI
- [x] Schema `Invitation` — campo `email` agregado
- [x] Migración SQL `20260725200000_add_email_to_invitation`
- [x] Tests actualizados
- [x] Env vars configuradas (SMTP, FRONTEND_URL)
- [x] `docker-compose.yml` actualizado

### Auditoría de ownership (completada)

- [x] **Invitación docente rediseñada** — el DOCENTE se registra normalmente (`POST /auth/register`), la invitación solo asocia a IE. `acceptTeacherInvitation` usa JWT (no crea cuenta). Creado `PublicInvitationController` para `GET /invitations/token/:token` (público, sin JWT).
- [x] **Classroom findAll** filtrado por ownership: DOCENTE=propias, DIRECTIVO=solo IEs propias, ADMIN=todas, FAMILIAR=hijos matriculados
- [x] **Classroom update/remove** verifican `classroom.teacherId === userId` (o ADMIN)
- [x] **Grade create/update/remove** verifican ownership via course→classroom→teacherId
- [x] **Attendance create/update** verifican ownership via classroom→teacherId
- [x] **InternalController** incluye `enrollments: { include: { student: true } }` en getClassroom y getAllClassrooms
- [x] **GradeService.update()** resuelve `classroomId` desde `courseId` antes de publicar `GRADE_UPDATED`
- [x] **Email templates** corregidos (subject usa campo correcto, `institutionName` removido de family-invitation)
- [x] **Limpieza de datos** — migración `cleanup_orphan_data` en analytics_db borra filas con `studentId` = authUserId viejo
- [x] **Course/Competency ownership** — create/update/remove/evaluate verifican classroom→teacherId
- [x] **SupportNeed ownership** — FAMILIAR solo modifica hijos propios, DOCENTE solo estudiantes en sus aulas
- [x] **Invitation email check** — acceptTeacherInvitation verifica JWT email vs invitation email
- [x] **createClassroom institutionId** — valida membresía en InstitutionTeacher antes de asociar IE
- [x] **FAMILIAR data leak** — Grade/Attendance reads filtran por Enrollment.familiarId
- [x] **Enrollment ownership** — getEnrollments/removeEnrollment verifican classroom→teacherId
- [x] **DTOs @IsUUID** — studentId en Grade, Competency, SupportNeed usan @IsUUID()
- [x] **Gateway public paths** — `/api/classroom/invitations/token/*` sin JWT (para links de email)
- [x] **GET /invitations** — endpoint para listar invitaciones creadas por el usuario
- [x] **Competency create solo ADMIN** — catálogo curricular no editable por DOCENTE
- [x] **Competency findByStudent FAMILIAR filter** — verifica enrollment antes de devolver datos
- [x] **API.md invitations paths** — documentación alineada con código real (`/invitations/teacher`, `/invitations/family`)
- [x] **SupportNeed findByStudent FAMILIAR filter** — verifica enrollment antes de devolver datos
- [x] **CourseService update/remove** — ownership check antes de findOne (evita query innecesaria si falla)
- [x] **Classroom findOne** — ownership check: DOCENTE→teacherId, FAMILIAR→enrollment
- [x] **Course findAll/findOne** — FAMILIAR solo ve cursos de aulas donde tiene hijos matriculados
- [x] **Analytics student reads** — FAMILIAR verify via Classroom internal endpoint
- [x] **Digital Twin getStudentTwin** — FAMILIAR verify via Classroom internal endpoint
- [x] **Recommendations dismiss** — DOCENTE verify ownership via Classroom internal endpoint

### Auditoría de ownership — segunda ronda (completada 2026-07-25)

- [x] **CourseService** — create/update/remove verifican ownership via classroom→teacherId.
- [x] **CompetencyService** — evaluate verifica ownership via course→classroom→teacherId.
- [x] **SupportNeedService** — create/update/remove verifican ownership: FAMILIAR→student.familiarId, DOCENTE→enrollment in one of their classrooms.
- [x] **acceptTeacherInvitation** — verifica que `invitation.email` coincida con el JWT email.
- [x] **Grade/Attendance reads** — FAMILIAR solo ve notas/asistencia de sus hijos (via Enrollment.familiarId).
- [x] **getEnrollments/removeEnrollment** — verifican classroom→teacherId para DOCENTE.
- [x] **createClassroom** — valida `institutionId` contra InstitutionTeacher si el DOCENTE proporciona uno.
- [x] **studentId DTOs** — `@IsString()` → `@IsUUID()` en Grade/Competency/SupportNeed.

---

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
- **El DOCENTE se registra normalmente** — la invitación de DIRECTIVO solo asocia al docente a una IE (no crea cuenta).
- **Email transaccional en Notifications** — Nodemailer con SMTP configurable, no un microservicio separado.
- **Un FAMILIAR puede tener varios hijos** — registra cada uno vía `POST /api/classroom/students`; cada invitación `FAMILY_TO_CLASSROOM` matricula **1 hijo** (constraint `@@unique([classroomId, studentId])`).
