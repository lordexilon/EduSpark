#!/bin/bash
# Script para configurar variables de entorno en Firebase Functions v2

# Obtener valores del .env (ajusta la ruta según tu configuración)
# Estos valores deben estar en tu archivo .env local
GOOGLE_CLIENT_ID="468517556859-qtbplkfnqqc6ru8ga7o3d1npo76t1b62.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# Para Firebase Functions v2, necesitamos usar gcloud directamente
# Primero, asegúrate de estar autenticado:
# gcloud auth login

# Configurar variables de entorno para la función analyzeFile
gcloud functions deploy analyzeFile \
  --gen2 \
  --region=us-central1 \
  --runtime=nodejs20 \
  --source=functions/analyzeFile \
  --entry-point=analyzeFile \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID",GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"

echo "Variables de entorno configuradas exitosamente"

