FROM nginx:alpine

# Copiar el build del frontend
COPY dist /usr/share/nginx/html

# Copiar configuración de Nginx para Cloud Run
COPY nginx-cloudrun.conf /etc/nginx/nginx.conf

# El script de inicio si es necesario, pero nginx:alpine ya tiene uno bueno.
# Si prefieres usar el script personalizado:
# COPY start-nginx.sh /start-nginx.sh
# RUN chmod +x /start-nginx.sh
# CMD ["/start-nginx.sh"]

# Exponer el puerto que Cloud Run espera
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
