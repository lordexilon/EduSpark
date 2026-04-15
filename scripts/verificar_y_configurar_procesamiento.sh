#!/bin/bash
# Script para verificar y configurar el sistema de procesamiento de jobs
# Uso: ./scripts/verificar_y_configurar_procesamiento.sh

set -e

echo "🔍 Verificando configuración del sistema de procesamiento..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar Cloud Scheduler
echo "1️⃣ Verificando Cloud Scheduler..."
echo ""

SCHEDULER_EXISTS=$(gcloud scheduler jobs list --location=us-central1 --format="value(name)" --filter="name:rag-worker-scheduler" 2>/dev/null || echo "")

if [ -z "$SCHEDULER_EXISTS" ]; then
    echo -e "${YELLOW}⚠️  Cloud Scheduler no encontrado${NC}"
    echo ""
    echo "¿Deseas crear el Cloud Scheduler ahora? (s/n)"
    read -r CREATE_SCHEDULER
    
    if [ "$CREATE_SCHEDULER" = "s" ] || [ "$CREATE_SCHEDULER" = "S" ]; then
        echo ""
        echo "📝 Creando Cloud Scheduler..."
        
        gcloud scheduler jobs create http rag-worker-scheduler \
            --location=us-central1 \
            --schedule="*/2 * * * *" \
            --uri="https://us-central1-eduspark-py.cloudfunctions.net/rag-worker" \
            --http-method=POST \
            --headers="Content-Type=application/json" \
            --message-body='{"action":"processPendingJobs"}' \
            --time-zone="America/Montevideo" \
            --attempt-deadline=540s \
            --max-retry-attempts=3 \
            --min-backoff-duration=10s \
            --max-backoff-duration=300s
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Cloud Scheduler creado exitosamente${NC}"
        else
            echo -e "${RED}❌ Error creando Cloud Scheduler${NC}"
            exit 1
        fi
    else
        echo "⏭️  Saltando creación del scheduler"
    fi
else
    echo -e "${GREEN}✅ Cloud Scheduler encontrado: rag-worker-scheduler${NC}"
    
    # Mostrar detalles del scheduler
    echo ""
    echo "📋 Detalles del scheduler:"
    gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1
fi

echo ""
echo ""

# 2. Verificar logs recientes de createFileProcessingJob
echo "2️⃣ Verificando logs recientes de createFileProcessingJob..."
echo ""

echo "📊 Últimos 20 logs relacionados con RAG worker:"
gcloud functions logs read createFileProcessingJob --limit=100 --format="table(timestamp,severity,textPayload)" 2>/dev/null | grep -i "rag worker" | head -20 || echo "No se encontraron logs relacionados"

echo ""
echo ""

# 3. Verificar logs del rag-worker
echo "3️⃣ Verificando logs del rag-worker..."
echo ""

echo "📊 Últimos 20 logs del rag-worker:"
gcloud functions logs read rag-worker --limit=20 --format="table(timestamp,severity,textPayload)" 2>/dev/null || echo "No se encontraron logs del rag-worker"

echo ""
echo ""

# 4. Verificar jobs pendientes en Supabase
echo "4️⃣ Verificar jobs pendientes..."
echo ""
echo "Ejecuta esta query en Supabase SQL Editor:"
echo ""
echo "SELECT id, status, created_at, updated_at, file_name, metadata->>'sourceFileId' as file_id"
echo "FROM file_processing_jobs"
echo "WHERE status = 'pending'"
echo "ORDER BY created_at DESC"
echo "LIMIT 10;"
echo ""

# 5. Opción para probar invocación manual
echo "5️⃣ ¿Deseas probar la invocación manual del rag-worker? (s/n)"
read -r TEST_MANUAL

if [ "$TEST_MANUAL" = "s" ] || [ "$TEST_MANUAL" = "S" ]; then
    echo ""
    echo "🧪 Invocando rag-worker manualmente..."
    
    curl -X POST https://us-central1-eduspark-py.cloudfunctions.net/rag-worker \
        -H "Content-Type: application/json" \
        -d '{"action":"processPendingJobs"}' \
        -v
    
    echo ""
    echo ""
    echo "✅ Invocación completada. Revisa los logs del rag-worker para ver el resultado."
fi

echo ""
echo ""
echo -e "${GREEN}✅ Verificación completada${NC}"
echo ""
echo "📝 Próximos pasos:"
echo "1. Revisa los logs de createFileProcessingJob para ver errores específicos"
echo "2. Verifica que el rag-worker esté respondiendo correctamente"
echo "3. Si hay jobs pendientes, espera 2 minutos para que el scheduler los procese"
echo "4. O invoca manualmente el rag-worker para procesar jobs pendientes"

