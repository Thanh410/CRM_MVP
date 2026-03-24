# ── Base ─────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# ── Development ───────────────────────────────────────────
FROM base AS development
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3001
CMD ["pnpm", "dev"]

# ── Builder ───────────────────────────────────────────────
FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── Production ────────────────────────────────────────────
FROM node:20-alpine AS production
RUN npm install -g pnpm
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
