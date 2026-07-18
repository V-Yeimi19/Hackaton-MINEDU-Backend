# Hackaton-MINEDU-Backend

Monorepo de microservicios NestJS para el hackathon MINEDU. Workspaces manuales con pnpm: cada servicio en `apps/*` es un proyecto NestJS independiente con su propio `package.json`.

## Estructura

```
apps/
  gateway/         Reverse proxy HTTP hacia todos los servicios
  auth/             Login, registro, JWT, roles (Prisma + Postgres)
  users/            CRUD de usuarios (Prisma + Postgres)
  storage/          Stub (Semana 2)
  notifications/    Stub (Semana 2)
  reports/          Stub (Semana 3)
  classroom/        Stub (Desarrollador B)
  analytics/        Stub (Desarrollador B)
  ai/               Stub (Desarrollador B)
  accessibility/    Stub (Desarrollador B)
packages/
  common/           @minedu/common: DTOs, guards, decoradores compartidos
```

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Setup local

```bash
pnpm install
cp .env.example .env
cp apps/gateway/.env.example apps/gateway/.env
cp apps/auth/.env.example apps/auth/.env
cp apps/users/.env.example apps/users/.env

docker compose up -d postgres redis minio

pnpm --filter auth prisma:migrate
pnpm --filter users prisma:migrate

pnpm dev:gateway   # otra terminal
pnpm dev:auth      # otra terminal
pnpm dev:users     # otra terminal
```

## Levantar toda la plataforma con Docker

```bash
docker compose up --build
```

Esto levanta Postgres, Redis, MinIO, el Gateway, Auth, Users y los stubs de los demás servicios (cada uno expone `GET /health`).

## Flujo de prueba

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"docente@minedu.gob.pe","password":"password123","fullName":"Ana Torres","role":"DOCENTE"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"docente@minedu.gob.pe","password":"password123"}'

curl http://localhost:3000/api/users/<id> \
  -H "Authorization: Bearer <accessToken>"
```
