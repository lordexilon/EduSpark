# Imagen base
FROM node:20-slim

# Dependencias del sistema necesarias para pdf-lib/ocr
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar manifests e instalar deps (incluye dev para construir)
COPY package*.json ./
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar a JavaScript y luego quedarnos solo con deps de producción
RUN npm run build && npm prune --production

# Cloud Run expone PORT
ENV PORT=8080
EXPOSE 8080

# Ejecutar la versión compilada
CMD ["node", "dist/index.js"]
