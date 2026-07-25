FROM node:22-alpine AS build
RUN corepack enable
RUN apk add --no-cache openssl
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages ./packages
COPY apps/auth ./apps/auth

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @minedu/common build
RUN pnpm --filter auth exec prisma generate
RUN pnpm --filter auth build

FROM node:22-alpine AS runtime
RUN corepack enable
RUN apk add --no-cache openssl
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/auth
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy; node dist/main.js"]
