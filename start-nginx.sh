#!/bin/sh
# Script de inicio para Cloud Run
# Reemplaza el puerto en la configuración de nginx con la variable PORT

PORT=${PORT:-8080}
sed -i "s/listen 8080;/listen ${PORT};/" /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'

