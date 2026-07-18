FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/accessibility ./apps/accessibility

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter accessibility build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/accessibility
EXPOSE 3009
CMD ["node", "dist/main.js"]
