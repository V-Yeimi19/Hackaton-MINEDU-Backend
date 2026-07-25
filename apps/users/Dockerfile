FROM node:22-alpine AS build
RUN corepack enable
RUN apk add --no-cache openssl
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages ./packages
COPY apps/users ./apps/users

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @minedu/common build
RUN pnpm --filter users exec prisma generate
RUN pnpm --filter users build

FROM node:22-alpine AS runtime
RUN corepack enable
RUN apk add --no-cache openssl
WORKDIR /repo

COPY --from=build /repo ./

WORKDIR /repo/apps/users
EXPOSE 3002
CMD ["sh", "-c", "npx prisma migrate deploy; node dist/main.js"]
