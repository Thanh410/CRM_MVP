# ── Base ─────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# ── Development ───────────────────────────────────────────
FROM base AS development
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate
EXPOSE 3000
CMD ["pnpm", "dev"]

# ── Builder ───────────────────────────────────────────────
FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate
RUN pnpm build

# ── Production ────────────────────────────────────────────
FROM node:20-alpine AS production
RUN npm install -g pnpm
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
