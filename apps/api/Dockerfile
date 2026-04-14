# ── Base ─────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

# ── Install deps (monorepo) ─────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

# ── Builder ──────────────────────────────────────────────
FROM deps AS builder
COPY packages/types/ ./packages/types/
COPY apps/api/ ./apps/api/
RUN cd apps/api && pnpm db:generate
RUN cd apps/api && pnpm build

# ── Production ───────────────────────────────────────────
FROM builder AS production
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
