# Dockerfile optimizado para Cloud Run
# Usa el build ya compilado localmente

FROM nginx:alpine

# Copiar build compilado
COPY dist /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx-cloudrun.conf /etc/nginx/nginx.conf

# Cloud Run espera que el servicio escuche en $PORT
ENV PORT=8080

# Iniciar nginx en el puerto especificado
CMD sed -i "s/listen 8080/listen ${PORT}/g" /etc/nginx/nginx.conf && nginx -g "daemon off;"
