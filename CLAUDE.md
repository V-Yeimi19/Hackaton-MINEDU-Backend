# Hackaton MINEDU Backend

Monorepo de microservicios NestJS, dividido por **capas de responsabilidad** entre 2 desarrolladores (no por microservicio), para minimizar bloqueos durante el hackathon.

- **Desarrollador A**: Gateway, Auth, Users, Storage, Notifications, Reports, Docker, seguridad. Ya implementado: Gateway, Auth, Users, docker-compose completo.
- **Desarrollador B**: Classroom, Analytics (Gemelo Digital), AI, Accessibility. Hoy son stubs de health-check en `apps/{classroom,analytics,ai,accessibility}` — B reemplaza el contenido sin tocar Gateway ni docker-compose.

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

### JWT validado en cada servicio, no solo en el Gateway
Cada servicio que necesita auth importa `JwtStrategy`/`JwtAuthGuard` de `@minedu/common` y registra `PassportModule` + el strategy como provider (ver `apps/users/src/auth/auth.module.ts` para el patrón mínimo). Todos comparten el mismo `JWT_SECRET` por env. Validación centralizada en el Gateway es trabajo de Semana 2, no está implementado.

### Llamadas internas entre servicios
Se protegen con un guard local (`InternalKeyGuard` en Users) que compara el header `x-internal-key` contra `INTERNAL_API_KEY`. Patrón a repetir si un servicio nuevo necesita ser llamado internamente por otro (ej. Classroom llamando a Notifications).

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
pnpm dev:gateway   # y dev:auth, dev:users en otras terminales
```

Flujo de humo ya verificado funcionando: `POST /api/auth/register` → `POST /api/auth/login` → `GET /api/users/:id` con Bearer token (self-access ok, roles no autorizados dan 403, sin token da 401).

`docker compose up --build` completo (las 10 imágenes) no se pudo validar en el sandbox de este agente por una política de red del registry proxeado (`minimumReleaseAge`) — es una restricción del entorno del agente, no del código; probablemente no ocurra en una máquina normal.
