# Pendientes

Última actualización: 2026-07-25. Snapshot de lo que quedó sin resolver tras implementar Reports, desplegar el stack completo en un VPS, reemplazar OpenAI por Groq en Accessibility, resolver la sincronización de rol Auth↔Users + el WebSocket de Notifications detrás del Gateway, y reemplazar `espeak-ng` por ElevenLabs para el texto-a-voz de Accessibility. Ver [ARCHITECTURE.md](./ARCHITECTURE.md), [SERVICES.md](./SERVICES.md) y [DATABASE.md](./DATABASE.md) para el estado completo del sistema — esta lista es solo lo que falta.

## Funcionalidad incompleta dentro de servicios ya implementados

- [ ] **Accessibility no persiste `audioFileId`/`subtitlesFileId`/`pictogramData`.** Los tres campos existen en `AccessibilityJob` (`apps/accessibility/prisma/schema.prisma`) pero el pipeline actual (`pipeline.service.ts`) nunca los llena: el audio se devuelve directo en la response de `POST /process/audio`, no se sube a Storage; no hay generación de subtítulos ni pictogramas.
- [ ] **Evento `competency.evaluated` sin consumidor.** Classroom lo publica (`competency.service.ts`) pero ningún servicio se suscribe — es el único de los 15 eventos del catálogo sin listener. Candidato natural: que Analytics lo incorpore al cálculo de riesgo/indicador.
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
