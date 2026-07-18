FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/storage ./apps/storage

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter storage build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/storage
EXPOSE 3003
CMD ["node", "dist/main.js"]
