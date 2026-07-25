-- Limpieza de datos huérfanos tras el remodelado de dominio (2026-07-25).
-- Todas las filas en estas tablas usan studentId = authUserId viejo,
-- que ya no existe como Student.id en classroom_db. No hay forma de
-- mapear authUserId → Student.id, así que se borran todas las filas.
-- Los servicios Analytics recalculan indicadores/riesgo en tiempo real
-- a partir de eventos nuevos, así que se repoblarán automáticamente.

DELETE FROM "Recommendation";
DELETE FROM "RiskAssessment";
DELETE FROM "StudentIndicator";
