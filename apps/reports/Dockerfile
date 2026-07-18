FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/reports ./apps/reports

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter reports build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/reports
EXPOSE 3005
CMD ["node", "dist/main.js"]
