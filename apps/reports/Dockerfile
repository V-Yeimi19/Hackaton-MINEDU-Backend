FROM node:22-alpine AS build
RUN corepack enable
RUN apk add --no-cache openssl
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/common ./packages/common
COPY apps/reports ./apps/reports

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @minedu/common build
RUN pnpm --filter reports exec prisma generate
RUN pnpm --filter reports build

FROM node:22-alpine AS runtime
RUN corepack enable
RUN apk add --no-cache openssl
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/reports
EXPOSE 3005
CMD ["sh", "-c", "npx prisma migrate deploy; node dist/main.js"]
