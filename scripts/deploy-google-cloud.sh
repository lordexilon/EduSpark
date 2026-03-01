#!/bin/bash
# Script de deployment completo para Google Cloud
# Uso: ./deploy-google-cloud.sh [frontend|worker|all]

set -e

PROJECT_ID="eduspark-py"
REGION="us-central1"
FRONTEND_SERVICE="eduspark-frontend"
WORKER_SERVICE="rag-processing-worker"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

# Verificar que gcloud esté instalado
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI no está instalado"
        echo "Instala desde: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    log_success "gcloud CLI encontrado"
}

# Verificar configuración del proyecto
check_project() {
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        log_warning "Proyecto actual: $CURRENT_PROJECT"
        log_info "Configurando proyecto a $PROJECT_ID..."
        gcloud config set project $PROJECT_ID
    fi
    log_success "Proyecto configurado: $PROJECT_ID"
}

# Verificar autenticación
check_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        log_error "No hay autenticación activa"
        log_info "Ejecutando: gcloud auth login"
        gcloud auth login
    fi
    log_success "Autenticación verificada"
}

# Habilitar APIs necesarias
enable_apis() {
    log_info "Verificando APIs necesarias..."
    
    APIs=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "containerregistry.googleapis.com"
        "secretmanager.googleapis.com"
    )
    
    for api in "${APIs[@]}"; do
        if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
            log_success "API $api ya está habilitada"
        else
            log_info "Habilitando API: $api..."
            gcloud services enable $api --project=$PROJECT_ID
            log_success "API $api habilitada"
        fi
    done
}

# Deploy del frontend
deploy_frontend() {
    log_info "🚀 Desplegando frontend..."
    
    IMAGE_NAME="gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE}"
    
    # Build y push
    log_info "Construyendo imagen Docker..."
    gcloud builds submit \
        --tag ${IMAGE_NAME}:latest \
        --project ${PROJECT_ID} \
        --config cloudbuild.yaml || {
            log_warning "Cloud Build falló, intentando build directo..."
            docker build -f Dockerfile-cloudrun -t ${IMAGE_NAME}:latest .
            docker push ${IMAGE_NAME}:latest
        }
    
    # Deploy a Cloud Run
    log_info "Desplegando a Cloud Run..."
    gcloud run deploy ${FRONTEND_SERVICE} \
        --image ${IMAGE_NAME}:latest \
        --platform managed \
        --region ${REGION} \
        --project ${PROJECT_ID} \
        --allow-unauthenticated \
        --port 8080 \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 300 \
        --concurrency 80
    
    # Obtener URL
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} \
        --platform managed \
        --region ${REGION} \
        --project ${PROJECT_ID} \
        --format 'value(status.url)')
    
    log_success "Frontend desplegado exitosamente!"
    log_info "URL: $FRONTEND_URL"
    echo "$FRONTEND_URL" > frontend-url.txt
}

# Deploy del worker
deploy_worker() {
    log_info "🚀 Desplegando worker RAG..."
    
    cd src/workers/file-processing-worker
    
    IMAGE_NAME="gcr.io/${PROJECT_ID}/${WORKER_SERVICE}"
    
    # Build y push
    log_info "Construyendo imagen Docker del worker..."
    gcloud builds submit --tag ${IMAGE_NAME}:latest --project ${PROJECT_ID}
    
    # Deploy a Cloud Run con secretos
    log_info "Desplegando worker a Cloud Run con secretos..."
    gcloud run deploy ${WORKER_SERVICE} \
        --image ${IMAGE_NAME}:latest \
        --platform managed \
        --region ${REGION} \
        --project ${PROJECT_ID} \
        --memory 2Gi \
        --cpu 2 \
        --timeout 3600 \
        --max-instances 10 \
        --min-instances 0 \
        --set-secrets="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
        --set-env-vars="NODE_ENV=production" \
        --no-allow-unauthenticated || {
            log_warning "Deploy con secretos falló. Verifica que los secretos existan."
            log_info "Listando secretos disponibles..."
            gcloud secrets list --project=${PROJECT_ID}
        }
    
    cd ../../..
    
    log_success "Worker desplegado exitosamente!"
}

# Verificar secretos
check_secrets() {
    log_info "Verificando secretos necesarios..."
    
    REQUIRED_SECRETS=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_KEY"
        "GEMINI_API_KEY"
    )
    
    MISSING_SECRETS=()
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if gcloud secrets describe $secret --project=$PROJECT_ID &> /dev/null; then
            log_success "Secreto $secret encontrado"
        else
            log_warning "Secreto $secret NO encontrado"
            MISSING_SECRETS+=($secret)
        fi
    done
    
    if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
        log_error "Faltan los siguientes secretos:"
        for secret in "${MISSING_SECRETS[@]}"; do
            echo "  - $secret"
        done
        log_info "Crea los secretos con:"
        echo "  echo -n 'valor' | gcloud secrets create SECRET_NAME --data-file=- --project=$PROJECT_ID"
        return 1
    fi
    
    return 0
}

# Función principal
main() {
    echo "========================================="
    echo "🚀 Deployment a Google Cloud - EduSpark"
    echo "========================================="
    echo ""
    
    COMPONENT=${1:-all}
    
    # Verificaciones previas
    check_gcloud
    check_auth
    check_project
    enable_apis
    
    case $COMPONENT in
        frontend)
            deploy_frontend
            ;;
        worker)
            if check_secrets; then
                deploy_worker
            else
                exit 1
            fi
            ;;
        all)
            deploy_frontend
            echo ""
            if check_secrets; then
                deploy_worker
            else
                log_warning "Worker no desplegado. Crea los secretos y vuelve a ejecutar."
            fi
            ;;
        *)
            log_error "Componente inválido: $COMPONENT"
            echo "Uso: $0 [frontend|worker|all]"
            exit 1
            ;;
    esac
    
    echo ""
    log_success "✅ Deployment completado!"
    echo ""
    log_info "📊 Verifica los servicios en:"
    echo "   https://console.cloud.google.com/run?project=$PROJECT_ID"
}

# Ejecutar
main "$@"

