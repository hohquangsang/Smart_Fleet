# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Cài openssl cho Prisma engine trên Alpine
RUN apk add --no-cache openssl

# Copy package files + .npmrc (approve-builds=false cho pnpm v10)
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma/

# Cài pnpm v9 (tránh lỗi ERR_PNPM_IGNORED_BUILDS của pnpm v10)
RUN npm install -g pnpm@9 && pnpm install --no-frozen-lockfile

# Generate Prisma client
RUN pnpm exec prisma generate

# Copy source code
COPY src/ ./src/

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Cài openssl runtime cho Prisma
RUN apk add --no-cache openssl

# Copy tất cả từ builder (bao gồm node_modules và prisma client đã generate)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000

CMD ["node", "src/server.js"]
