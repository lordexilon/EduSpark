#!/bin/bash

# Script para desplegar el worker RAG a Google Cloud Run
# Uso: ./deploy-rag-worker.sh

set -e

echo "🚀 Desplegando RAG Worker a Google Cloud Run..."

# Configuración
PROJECT_ID="eduspark-py"
SERVICE_NAME="rag-processing-worker"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Verificar que gcloud esté instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI no está instalado"
    echo "Instala desde: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Cambiar al directorio del worker
cd "$(dirname "$0")/src/workers/file-processing-worker"

echo "📦 Construyendo imagen Docker..."
gcloud builds submit --tag ${IMAGE_NAME} --project ${PROJECT_ID}

echo "🚢 Desplegando a Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 10 \
  --min-instances 1 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "WORKER_INTERVAL_MS=30000" \
  --no-allow-unauthenticated

echo "🔐 Configurando secretos..."
echo "Por favor, configura las siguientes variables de entorno en Google Cloud Console:"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_KEY"
echo "  - GOOGLE_CLIENT_ID"
echo "  - GOOGLE_CLIENT_SECRET"
echo "  - VITE_GEMINI_API_KEY"
echo ""
echo "Enlace: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/revisions?project=${PROJECT_ID}"

echo "✅ Deployment completado!"
echo "📊 URL del servicio:"
gcloud run services describe ${SERVICE_NAME} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)'
