#!/bin/bash
# Script para ver logs completos de un job específico
# Uso: ./ver-logs-job.sh <jobId>

JOB_ID=$1

if [ -z "$JOB_ID" ]; then
  echo "Uso: ./ver-logs-job.sh <jobId>"
  echo "Ejemplo: ./ver-logs-job.sh WywM1Kgj5aFFqaE4mjgh"
  exit 1
fi

echo "🔍 Buscando logs para job: $JOB_ID"
echo "=========================================="
echo ""

# Buscar logs en Firebase
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=processfilejob AND textPayload=~\"$JOB_ID\"" \
  --project=eduspark-py \
  --limit=50 \
  --format=json \
  --freshness=1h | jq -r '.[] | "\(.timestamp) - \(.textPayload // .jsonPayload.message // "")"'

echo ""
echo "=========================================="
echo "Para ver más logs, ejecuta:"
echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=processfilejob\" --project=eduspark-py --limit=100 --freshness=1h"

