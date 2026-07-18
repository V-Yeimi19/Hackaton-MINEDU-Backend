FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/gateway ./apps/gateway

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter gateway build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/gateway
EXPOSE 3000
CMD ["node", "dist/main.js"]
