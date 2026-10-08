# =========================
# Build stage
# =========================
FROM node:20.20-alpine3.23 AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# =========================
# Production stage
# =========================
FROM nginx:1.31.6-alpine3.24
RUN apk upgrade --no-cache

# ⬇️ ПОДМЕНЯЕМ ГЛАВНЫЙ nginx.conf
COPY nginx-main.conf /etc/nginx/nginx.conf

# ⬇️ ТВОЙ server {}
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ⬇️ ФРОНТ
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD ["wget", "-qO", "/dev/null", "http://127.0.0.1/"]

CMD ["nginx", "-g", "daemon off;"]
