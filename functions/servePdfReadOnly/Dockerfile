FROM node:20-slim

WORKDIR /app

# Copiar package.json primero para cachear deps
COPY package.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar código fuente
COPY index.js ./

# Puerto por defecto de Cloud Run
ENV PORT=8080

# Exponer puerto
EXPOSE 8080

# Iniciar el servidor
CMD ["npm", "start"]
