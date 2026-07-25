# Pendientes

Última actualización: 2026-07-25 (post-remodelado de BD: IE/roles/invitaciones).

## ⚠️ Refactor IE/roles: trabajo de aplicación pendiente (PRIORITARIO)

El 2026-07-25 se remodeló el dominio **solo a nivel de base de datos** (schemas Prisma + migraciones + enum `Role` en `@minedu/common`): jerarquía `Institution → Classroom (aula) → Course`, roles `ADMIN|DIRECTIVO|DOCENTE|FAMILIAR` (desaparecen `ESPECIALISTA`/`ESTUDIANTE`), estudiantes como registros `Student` (ya no usuarios), matrícula `Enrollment` al aula vía `Invitation` por link (1 hijo por invitación), asistencia por aula y notas/competencias por curso. Detalle del modelo en [DATABASE.md](./DATABASE.md#classroom_db--classroom-11-modelos-el-esquema-más-grande). **La adaptación del código de aplicación es de otro desarrollador** — esta es la lista concreta de lo afectado (verificada por grep contra el código actual):

### Compilación rota (intencional, hasta adaptar)

`@minedu/common` ya exporta el `Role` nuevo y los clientes Prisma de classroom se regenerarán contra el schema nuevo en el próximo build — estos archivos no compilan hasta adaptarse:

- [ ] `apps/classroom/src/classroom/classroom.controller.ts:42,48` + `classroom.services.ts` — `@Roles(Role.ESTUDIANTE)` en `enroll`/`unenroll` y todo el manejo de `studentIds` (campo eliminado). El flujo entero se reemplaza por invitaciones (`Invitation` + `Enrollment`). Los DTOs de Classroom además necesitan `institutionId`/`gradeLevel`.
- [ ] `apps/classroom/src/course/*` (controller, service, DTOs) — `Course` ya no tiene `gradeLevel` ni `teacherId` (viven en `Classroom`) y ahora exige `classroomId` (relación invertida).
- [ ] `apps/classroom/src/grade/*` y `apps/classroom/src/competency/*` — `Grade`/`StudentCompetency` ahora referencian `courseId`, no `classroomId`; DTOs y queries cambian.
- [ ] `apps/classroom/src/attendance/*` — vigente en estructura (sigue por aula), pero `studentId` ahora es `Student.id` con FK real: registrar asistencia de un estudiante no matriculado o inexistente fallará por FK — validar contra `Enrollment`.
- [ ] `apps/classroom/src/support-need/support-need.controller.ts:13,19,25,31` — quitar `ESPECIALISTA` de los guards; `studentId` ahora es `Student.id`; decidir acceso del `FAMILIAR` (el modelo sugiere que registre las necesidades de su propio hijo al crearlo).
- [ ] `apps/classroom/src/internal/internal.controller.ts` — adaptar contratos: `GET /internal/classroom/:id/grades` ahora debe agregar las notas de los cursos del aula; la "matrícula" se lee de `Enrollment`; agregar lo que necesite el flujo de invitaciones.
- [ ] `apps/accessibility/src/accessibility.controller.ts:13,23,34,44,50` — quitar `ESPECIALISTA` de los guards. `GenerateWorksheetDto.studentId` pasa a ser `Student.id` (el endpoint interno de support-needs no cambia de forma, solo de semántica del id).
- [ ] `apps/analytics/src/indicators/indicators.controller.ts:11,17,26`, `digital-twin.controller.ts:12,18`, `recommendation.controller.ts:11,17` — quitar `ESPECIALISTA`/`ESTUDIANTE`. El acceso "self" del estudiante desaparece (ya no loguea); definir si el `FAMILIAR` puede ver los indicadores de sus hijos (requiere resolver la relación `familiarId → Student` vía Classroom).

### Lógica a adaptar (compila pero queda incorrecta)

- [ ] `apps/analytics/src/digital-twin/digital-twin.service.ts` + `event-listeners/` — dependían de `studentIds` del aula (ahora `Enrollment` vía HTTP interno) y de eventos de nota/competencia con `classroomId` directo. Como `Grade`/`StudentCompetency` ahora son por curso, **Classroom debe incluir `classroomId` resuelto vía `Course` en los payloads de `grade.*` y `competency.evaluated`** (opción recomendada: resolverlo en el publicador, no en cada consumidor). `StudentIndicator`/`RiskAssessment` siguen keyed por `[studentId, classroomId]` — sin cambio de schema en analytics_db, pero `studentId` ahora significa `Student.id`.
- [ ] `apps/ai/src/report/report.service.ts` y `apps/reports/src/report/report.service.ts` — usan `classroom.studentIds` (eliminado) y `/internal/classroom/:id/grades`; adaptar a `Enrollment` + notas agregadas por cursos del aula. El conteo de estudiantes y el cruce con indicadores/riesgo usa ahora `Student.id`.
- [ ] `test/e2e.smoke.spec.ts` y `test/*.integration.spec.ts` — registran usuarios con `role: ESTUDIANTE`/`ESPECIALISTA` (ahora 400) y usan el flujo enroll viejo.
- [ ] Datos residuales: analytics_db y accessibility_db conservan filas con `studentId` = authUserId viejos (huérfanos tras el reset de classroom_db) — limpiar o ignorar.

### Endpoints nuevos por construir

- [ ] CRUD de `Institution` — solo `DIRECTIVO` crea/administra sus IEs.
- [ ] Invitaciones: `DIRECTIVO` genera link `TEACHER_TO_INSTITUTION`; `DOCENTE` (miembro de la IE vía `InstitutionTeacher`) genera link `FAMILY_TO_CLASSROOM`; endpoints de aceptar (valida token único/no expirado/no usado, crea `InstitutionTeacher` o `Enrollment` según tipo) y revocar.
- [ ] Registro de `Student` por el `FAMILIAR` (con `StudentSupportNeed` opcionales en el mismo flujo) y edición/lectura de sus propios hijos.
- [ ] Matrícula: al aceptar una invitación de aula, el `FAMILIAR` elige **1** de sus hijos → se crea el `Enrollment` (constraint `@@unique([classroomId, studentId])` ya lo protege de duplicados).

### Despliegue

- [ ] **NO redeployar** classroom/analytics/ai/reports/accessibility al VPS hasta completar la adaptación — el build de Docker fallará al regenerar el cliente Prisma (esperado). `auth` y `users` sí compilan y pueden desplegarse (sus migraciones mapean roles: `ESTUDIANTE→FAMILIAR`, `ESPECIALISTA→DOCENTE`), pero conviene desplegar todo junto al final para no dejar el stack híbrido.
- Las migraciones se aplican solas al bootear cada contenedor (`prisma migrate deploy` en el CMD del Dockerfile). La de classroom (`20260725170002_institutions_and_families`) es **destructiva**: dropea y recrea todo el dominio (aprobado — data de prueba).

---

Lo que sigue es el snapshot histórico de pendientes previos al remodelado (Reports, despliegue VPS, Groq, rol Auth↔Users, WebSocket, ElevenLabs, `competency.evaluated`, persistencia de Accessibility, support-needs + fichas). Ver [ARCHITECTURE.md](./ARCHITECTURE.md), [SERVICES.md](./SERVICES.md) y [DATABASE.md](./DATABASE.md) para el estado completo del sistema — esta lista es solo lo que falta.

## Funcionalidad incompleta dentro de servicios ya implementados

- [x] **Accessibility no persiste `audioFileId`/`subtitlesFileId`/`pictogramData`.** Los tres campos existen en `AccessibilityJob` (`apps/accessibility/prisma/schema.prisma`) pero el pipeline actual (`pipeline.service.ts`) nunca los llena: el audio se devuelve directo en la response de `POST /process/audio`, no se sube a Storage; no hay generación de subtítulos ni pictogramas. **Resuelto 2026-07-25:** el pipeline ahora sube el audio a Storage (`audioFileId`), genera un archivo SRT con timestamps proporcionales y lo sube a Storage (`subtitlesFileId`), y consulta la API pública de ARASAAC para obtener pictogramas por keyword del texto adaptado (`pictogramData`). La subida a Storage usa `POST /internal/upload` (base64 JSON, mismo patrón que AI y Reports). También se corrigió el límite de body de Storage (`express.json({ limit: '10mb' })` en `main.ts`) para aceptar payloads de audio grandes. **Fix 2026-07-25 (post-ElevenLabs):** la primera versión de este cambio asumía que `AudioService` seguía generando WAV (heredado de `espeak-ng`) y usaba el header RIFF del buffer para calcular la duración del SRT; como ElevenLabs devuelve MP3 (`mp3_44100_128`, sin `outputFormat` explícito), eso producía una duración basura y un archivo mal etiquetado (`audio/wav` sobre bytes MP3). Corregido: el archivo se sube como `audio-{id}.mp3`/`audio/mpeg`, y la duración del SRT se estima por velocidad de habla (`estimateSpeechDuration` en `srt.util.ts`, ~15 caracteres/segundo) en vez de parsear el audio. **Fix adicional 2026-07-25:** el mismo resto de `espeak-ng` seguía en el endpoint de descarga directa — `POST /process/audio` (`accessibility.controller.ts`) respondía `Content-Type: audio/wav` y `filename=...wav` sobre el mismo buffer MP3 de ElevenLabs (el `Content-Type` de la respuesta HTTP no coincidía con los bytes reales, aunque la copia subida a Storage ya estaba correcta desde el fix anterior). Corregido a `audio/mpeg`/`.mp3`, igual que la copia en Storage.
- [x] **Evento `competency.evaluated` sin consumidor.** Classroom lo publica (`competency.service.ts`) pero ningún servicio se suscribe — es el único de los 15 eventos del catálogo sin listener. Candidato natural: que Analytics lo incorpore al cálculo de riesgo/indicador. **Resuelto 2026-07-25:** se agregó `CompetencyEventsListener` en Analytics que se suscribe a `competency.evaluated`, recalcula el `competencyScore` promedio del estudiante en `StudentIndicator` (nuevos campos `competencyScore`/`competencyCount`), y reevalúa el riesgo. El nivel de competencia (`BASICO=0.25`, `INTERMEDIO=0.5`, `AVANZADO=0.75`, `LOGRADO=1.0`) se integra en `risk.rules.ts` con umbrales `COMPETENCY_LOW: 0.5` / `COMPETENCY_CRITICAL: 0.25`. Requirió agregar `classroomId` al modelo `StudentCompetency` en Classroom (schema + DTO + servicio).
- [x] ~~Rol duplicado entre Auth y Users sin sincronización.~~ Resuelto 2026-07-25: `PATCH /api/auth/:authUserId/role` (ADMIN) en Auth cambia `AuthUser.role`, publica `user.role_changed`, Users se suscribe y sincroniza su copia. Además invalida JWTs viejos (ver `JwtStrategy` en `docs/SERVICES.md#invalidación-de-sesión-por-cambio-de-rol`).

## Infraestructura / plataforma

- [x] ~~WebSocket de Notifications no pasa por el Gateway.~~ Resuelto 2026-07-25: `/ws/notifications` se proxya desde el Gateway (`http-proxy-middleware`, `ws: true`, hook en el evento `upgrade`) hacia Notifications; el puerto `3004` ya no está publicado directamente. Cliente: `io('http://<gateway>:3000/notifications', { path: '/ws/notifications', auth: { token } })`.
- [ ] **Sin CI/CD.** No hay `.github/workflows` — nada corre `pnpm test`/`test:e2e`/lint automáticamente en cada push o PR. Todo lo validado hasta ahora fue manual.
- [ ] **Sin tests unitarios.** Solo existen `test/*.integration.spec.ts` (bootean el `AppModule` completo) y `test/e2e.smoke.spec.ts`. La lógica de negocio más específica (`risk.rules.ts`, `recommendation.rules.ts`, cálculo de indicadores en `indicators.service.ts`) no tiene ningún test aislado.

## Soluciones "de hackathon", no de producción

- [ ] **Todo el stack corre en HTTP plano, sin TLS** (Gateway, MinIO expuesto por IP pública).
- [x] ~~`espeak-ng` como TTS es funcional pero de calidad robótica.~~ Resuelto 2026-07-25: `AudioService` (Accessibility) ahora usa ElevenLabs (`@elevenlabs/elevenlabs-js`, modelo `eleven_multilingual_v2`) en vez de `espeak-ng`. Requiere `ELEVENLABS_API_KEY` (Joi la exige, el servicio no arranca sin ella) y opcionalmente `ELEVENLABS_VOICE_ID` (default `JBFqnCBsd6RMkjVDRZzb`). El binario `espeak-ng` ya no se instala en el Dockerfile de runtime.
- [ ] **Reports (CSV) no tiene versión PDF ni generación automática por cron**, a diferencia de AI (que sí tiene ambas para su reporte por aula). Si se quiere paridad, replicar el patrón de `ScheduleService` de AI.

## Decisiones ya tomadas (no reabrir sin razón)

Contexto para no repetir discusiones ya resueltas esta sesión:

- **Reports vs AI**: coexisten a propósito, alcance distinto (multi-aula agregado vs. una sola aula). Ver `docs/SERVICES.md#ai-vs-reports`.
- **Accessibility usa Groq (no OpenAI)** para adaptación de texto — sin key de OpenAI disponible.
- **Accessibility usa ElevenLabs (no espeak-ng)** para texto-a-voz desde 2026-07-25 — ver arriba.
- **`MINIO_ENDPOINT` es configurable por env**, default `minio` (interno). En el despliegue actual apunta a la IP pública del VPS para que las descargas funcionen desde fuera.
- **Cambio de rol vive en Auth, no en Users** — Auth es la fuente que se firma en el JWT, evita tener dos fuentes de verdad. La invalidación de sesión corre en `JwtStrategy` compartido (todo servicio con `JwtAuthGuard`), no solo en el Gateway, y es fail-open si Redis no responde.
- **Fichas didácticas se acoplan a Accessibility, no son un módulo nuevo** — el desafío de Educación Básica Especial es literalmente su dominio, y ya existía la tubería completa a reusar (Groq, ARASAAC, subida a Storage). `StudentSupportNeed` vive en Classroom (no en Accessibility ni Users) porque es un dato del estudiante en su contexto de aula, consumido de forma síncrona (HTTP interno, fail-open) en vez de por evento, porque Accessibility lo necesita *ya* al generar la ficha.
