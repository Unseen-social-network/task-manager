# =========================
# Build stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# =========================
# Production stage
# =========================
FROM nginx:1.25-alpine

# ⬇️ ПОДМЕНЯЕМ ГЛАВНЫЙ nginx.conf
COPY nginx-main.conf /etc/nginx/nginx.conf

# ⬇️ ТВОЙ server {}
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ⬇️ ФРОНТ
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
