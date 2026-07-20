FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/common ./packages/common
COPY apps/classroom ./apps/classroom

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @minedu/common build
RUN pnpm --filter classroom exec prisma generate
RUN pnpm --filter classroom build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/classroom
EXPOSE 3006
CMD ["node", "dist/main.js"]
