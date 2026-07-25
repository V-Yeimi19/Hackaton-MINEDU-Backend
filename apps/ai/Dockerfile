FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/common ./packages/common
COPY apps/ai ./apps/ai

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @minedu/common build
RUN pnpm --filter ai exec prisma generate
RUN pnpm --filter ai build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/ai
EXPOSE 3008
CMD ["sh", "-c", "npx prisma migrate deploy; node dist/main.js"]
