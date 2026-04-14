# ── Base ─────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
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
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/types/ ./packages/types/
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
