#!/bin/bash
# Script para apagar la VM automáticamente cuando no hay jobs pendientes
# Ejecutar en la VM como cron job cada 10 minutos

# Verificar si hay jobs pendientes en Firestore
# (Requiere configurar credenciales de Firebase)

IDLE_TIME_MINUTES=30  # Apagar si no hay jobs por 30 minutos

# Obtener timestamp del último job procesado
LAST_JOB_TIME=$(sudo journalctl -u rag-worker --since "30 minutes ago" | grep "Job completado" | tail -1)

if [ -z "$LAST_JOB_TIME" ]; then
    echo "No hay jobs recientes. Apagando VM..."
    sudo shutdown -h now
else
    echo "Hay actividad reciente. VM sigue encendida."
fi
