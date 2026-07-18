FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/notifications ./apps/notifications

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter notifications build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/notifications
EXPOSE 3004
CMD ["node", "dist/main.js"]
