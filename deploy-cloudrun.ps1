# Script de despliegue a Cloud Run
# Uso: .\deploy-cloudrun.ps1

param(
    [string]$ProjectId = "eduspark-py",
    [string]$Region = "us-central1"
)

Write-Host "Desplegando EduSpark a Cloud Run..." -ForegroundColor Cyan

# Verificar que gcloud este instalado
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "Error: gcloud CLI no esta instalado" -ForegroundColor Red
    Write-Host "Instala desde: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Configurar proyecto
Write-Host "Configurando proyecto: $ProjectId" -ForegroundColor Cyan
gcloud config set project $ProjectId

# Verificar que el proyecto este configurado
$currentProject = gcloud config get-value project
if (-not $currentProject) {
    Write-Host "Error: No se pudo configurar el proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "Proyecto: $currentProject" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green

# Habilitar APIs necesarias
Write-Host ""
Write-Host "Habilitando APIs necesarias..." -ForegroundColor Cyan
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al habilitar APIs" -ForegroundColor Red
    exit 1
}

Write-Host "APIs habilitadas correctamente" -ForegroundColor Green

# Build y deploy
Write-Host ""
Write-Host "Iniciando build y deploy..." -ForegroundColor Cyan
Write-Host "Esto puede tardar varios minutos..." -ForegroundColor Yellow

gcloud builds submit --config cloudbuild.yaml

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Despliegue exitoso!" -ForegroundColor Green
    
    # Obtener URL del servicio
    $serviceUrl = gcloud run services describe eduspark-frontend --region $Region --format 'value(status.url)' 2>$null
    
    if ($serviceUrl) {
        Write-Host ""
        Write-Host "URL del servicio: $serviceUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "Para ver logs:" -ForegroundColor Cyan
        Write-Host "   gcloud run services logs read eduspark-frontend --region $Region" -ForegroundColor White
        Write-Host ""
        Write-Host "Para actualizar variables de entorno:" -ForegroundColor Cyan
        Write-Host "   gcloud run services update eduspark-frontend --region $Region --set-env-vars 'KEY=value'" -ForegroundColor White
    } else {
        Write-Host "Advertencia: No se pudo obtener la URL del servicio" -ForegroundColor Yellow
        Write-Host "Verifica manualmente en: https://console.cloud.google.com/run" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Error en el despliegue" -ForegroundColor Red
    Write-Host "Revisa los logs arriba para mas detalles" -ForegroundColor Yellow
    exit 1
}

