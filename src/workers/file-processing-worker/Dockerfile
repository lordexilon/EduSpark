FROM node:20-slim

WORKDIR /app

# Instalar dependencias del sistema para PDF
RUN apt-get update && apt-get install -y \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Exponer puerto (si es necesario para health checks)
EXPOSE 8080

# Comando de inicio
CMD ["node", "index.js"]

