# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files + .npmrc (approve-builds=false cho pnpm v10)
COPY package.json pnpm-lock.yaml .npmrc ./

# Cài pnpm v9 (tránh lỗi ERR_PNPM_IGNORED_BUILDS của pnpm v10)
RUN npm install -g pnpm@9 && pnpm install --no-frozen-lockfile

# Copy toàn bộ source code
COPY . .

# Build production bundle (Vite) - bỏ qua tsc vì source dùng .jsx
RUN pnpm exec vite build

# ── Stage 2: Nginx để serve static files ──────────────────────────────────────
FROM nginx:1.25-alpine

# Xóa config nginx mặc định
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config tùy chỉnh
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy file build từ Vite (output vào /dist)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
