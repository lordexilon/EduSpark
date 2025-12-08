# Usar una imagen base de Node.js
FROM node:20-slim

# Instalar dependencias del sistema necesarias para pdf-lib y canvas
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

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar todas las dependencias (incluyendo ts-node)
RUN npm ci && npm install -g ts-node typescript

# Copiar el código fuente del worker
COPY . .

# Exponer el puerto 8080 (requerido por Cloud Run)
EXPOSE 8080

# Comando para iniciar el worker con ts-node (ejecutar TypeScript directamente)
CMD ["node_modules/.bin/ts-node", "index.ts"]
