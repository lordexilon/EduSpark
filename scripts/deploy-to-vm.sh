#!/bin/bash
# Deploy script para actualizar el RAG Worker en la VM
# Ejecutar desde tu máquina local: bash deploy-to-vm.sh

set -e

VM_NAME="rag-worker-vm"
VM_ZONE="us-central1-a"
PROJECT="eduspark-py"

echo "🚀 Deployando RAG Worker a VM..."

# 1. Copiar archivos actualizados a la VM
echo "📦 Copiando archivos..."
gcloud compute scp --recurse \
  functions/rag-worker/* \
  ${VM_NAME}:/opt/rag-worker/functions/rag-worker/ \
  --zone=${VM_ZONE} \
  --project=${PROJECT}

# 2. Instalar dependencias en la VM
echo "📦 Instalando dependencias..."
gcloud compute ssh ${VM_NAME} \
  --zone=${VM_ZONE} \
  --project=${PROJECT} \
  --command="cd /opt/rag-worker/functions/rag-worker && npm install"

# 3. Reiniciar el servicio
echo "🔄 Reiniciando servicio..."
gcloud compute ssh ${VM_NAME} \
  --zone=${VM_ZONE} \
  --project=${PROJECT} \
  --command="sudo systemctl restart rag-worker"

# 4. Verificar estado
echo "✅ Verificando estado del servicio..."
gcloud compute ssh ${VM_NAME} \
  --zone=${VM_ZONE} \
  --project=${PROJECT} \
  --command="sudo systemctl status rag-worker --no-pager"

echo ""
echo "✅ Deploy completado!"
echo "📝 Ver logs: gcloud compute ssh ${VM_NAME} --zone=${VM_ZONE} --command='sudo journalctl -u rag-worker -f'"
