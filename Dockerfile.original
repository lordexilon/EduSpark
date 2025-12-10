# Dockerfile para EduSpark
# Build multi-stage para optimizar tamaño

# ========================================
# Stage 1: Build del Frontend
# ========================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Build del frontend
RUN npm run build

# ========================================
# Stage 2: Build del Worker
# ========================================
FROM node:18-alpine AS worker-builder

WORKDIR /app/worker

# Copiar package files del worker
COPY src/workers/file-processing-worker/package*.json ./

# Instalar dependencias del worker
RUN npm ci --only=production

# Copiar código del worker
COPY src/workers/file-processing-worker/ ./

# Compilar TypeScript si es necesario
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# ========================================
# Stage 3: Frontend Production Server
# ========================================
FROM nginx:alpine AS frontend

# Copiar build del frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ========================================
# Stage 4: Worker Production Server
# ========================================
FROM node:18-alpine AS worker

WORKDIR /app

# Copiar archivos built del worker
COPY --from=worker-builder /app/worker ./

# Copiar .env si existe (mejor usar docker-compose env)
# COPY .env .env

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

CMD ["node", "index.js"]
