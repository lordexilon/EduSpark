# Script de despliegue del frontend a Google Cloud Run
# Proyecto: eduspark-py
# Uso: .\scripts\deploy-frontend-cloudrun.ps1

param(
    [string]$ProjectId = "eduspark-py",
    [string]$Region = "us-central1",
    [switch]$SkipBuild = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Despliegue Frontend a Cloud Run" -ForegroundColor Cyan
Write-Host "  Proyecto: $ProjectId" -ForegroundColor Cyan
Write-Host "  Región: $Region" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que gcloud está instalado
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: gcloud CLI no está instalado" -ForegroundColor Red
    Write-Host "   Instala desde: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Configurar proyecto
Write-Host "📋 Configurando proyecto..." -ForegroundColor Cyan
gcloud config set project $ProjectId 2>&1 | Out-Null

$currentProject = gcloud config get-value project 2>$null
if (-not $currentProject -or $currentProject -ne $ProjectId) {
    Write-Host "❌ Error: No se pudo configurar el proyecto $ProjectId" -ForegroundColor Red
    Write-Host "   Verifica que el proyecto existe y tienes permisos" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Proyecto configurado: $currentProject" -ForegroundColor Green
Write-Host ""

# Habilitar APIs necesarias
Write-Host "🔧 Habilitando APIs necesarias..." -ForegroundColor Cyan
gcloud services enable cloudbuild.googleapis.com --quiet 2>&1 | Out-Null
gcloud services enable run.googleapis.com --quiet 2>&1 | Out-Null
gcloud services enable containerregistry.googleapis.com --quiet 2>&1 | Out-Null
Write-Host "✅ APIs habilitadas" -ForegroundColor Green
Write-Host ""

# Compilar localmente si no se omite
if (-not $SkipBuild) {
    Write-Host "🔨 Compilando frontend localmente..." -ForegroundColor Cyan
    Write-Host "   Esto puede tardar 1-2 minutos..." -ForegroundColor Yellow
    
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al compilar el frontend" -ForegroundColor Red
        exit 1
    }
    
    if (-not (Test-Path "dist")) {
        Write-Host "❌ Error: La carpeta dist/ no existe después del build" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Build local completado" -ForegroundColor Green
    Write-Host ""
}

# Desplegar usando Cloud Build
Write-Host "🚀 Iniciando despliegue a Cloud Run..." -ForegroundColor Cyan
Write-Host "   Esto puede tardar 5-10 minutos..." -ForegroundColor Yellow
Write-Host ""

gcloud builds submit --config cloudbuild.yaml

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Despliegue exitoso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Obtener URL del servicio
    $serviceUrl = gcloud run services describe eduspark-frontend --region $Region --format 'value(status.url)' 2>$null
    
    if ($serviceUrl) {
        Write-Host "🌐 URL del servicio:" -ForegroundColor Cyan
        Write-Host "   $serviceUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "📊 Comandos útiles:" -ForegroundColor Cyan
        Write-Host "   Ver logs:     gcloud run services logs read eduspark-frontend --region $Region" -ForegroundColor White
        Write-Host "   Ver detalles: gcloud run services describe eduspark-frontend --region $Region" -ForegroundColor White
        Write-Host "   Abrir en web: https://console.cloud.google.com/run/services?hl=es&project=$ProjectId" -ForegroundColor White
    } else {
        Write-Host "⚠️  No se pudo obtener la URL del servicio" -ForegroundColor Yellow
        Write-Host "   Verifica en: https://console.cloud.google.com/run/services?hl=es&project=$ProjectId" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "❌ Error en el despliegue" -ForegroundColor Red
    Write-Host "   Revisa los logs arriba para más detalles" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Soluciones comunes:" -ForegroundColor Cyan
    Write-Host "   1. Verifica que las variables de entorno estén en cloudbuild.yaml" -ForegroundColor White
    Write-Host "   2. Verifica que dist/ existe y tiene contenido" -ForegroundColor White
    Write-Host "   3. Revisa los logs: gcloud builds log <BUILD_ID>" -ForegroundColor White
    exit 1
}
