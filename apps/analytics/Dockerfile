FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/common ./packages/common
COPY apps/analytics ./apps/analytics

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @minedu/common build
RUN pnpm --filter analytics exec prisma generate
RUN pnpm --filter analytics build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/analytics
EXPOSE 3007
CMD ["sh", "-c", "npx prisma migrate deploy; node dist/main.js"]
