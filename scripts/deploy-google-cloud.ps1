# Script completo de despliegue a Google Cloud Run
# Uso: .\scripts\deploy-google-cloud.ps1 -ProjectId "eduspark-py" -Region "us-central1"

param(
    [string]$ProjectId = "eduspark-py",
    [string]$Region = "us-central1",
    [switch]$SkipBuild = $false,
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Despliegue EduSpark a Google Cloud  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que gcloud esté instalado
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: gcloud CLI no está instalado" -ForegroundColor Red
    Write-Host "   Instala desde: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Verificar que Docker esté instalado
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Docker no está instalado" -ForegroundColor Red
    Write-Host "   Instala desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Configurar proyecto
Write-Host "📋 Configurando proyecto: $ProjectId" -ForegroundColor Cyan
gcloud config set project $ProjectId | Out-Null

$currentProject = gcloud config get-value project
if (-not $currentProject) {
    Write-Host "❌ Error: No se pudo configurar el proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Proyecto: $currentProject" -ForegroundColor Green
Write-Host "✅ Región: $Region" -ForegroundColor Green
Write-Host ""

# Habilitar APIs necesarias
Write-Host "🔧 Habilitando APIs necesarias..." -ForegroundColor Cyan
$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "containerregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "   Habilitando $api..." -ForegroundColor Gray
    gcloud services enable $api --quiet 2>&1 | Out-Null
}

Write-Host "✅ APIs habilitadas" -ForegroundColor Green
Write-Host ""

# Compilar proyecto
if (-not $SkipBuild) {
    Write-Host "🔨 Compilando proyecto..." -ForegroundColor Cyan
    Write-Host "   Esto puede tardar varios minutos..." -ForegroundColor Yellow
    
    # Verificar que node_modules existe
    if (-not (Test-Path "node_modules")) {
        Write-Host "   Instalando dependencias..." -ForegroundColor Gray
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error al instalar dependencias" -ForegroundColor Red
            exit 1
        }
    }
    
    # Limpiar build anterior
    if (Test-Path "dist") {
        Write-Host "   Limpiando build anterior..." -ForegroundColor Gray
        Remove-Item -Recurse -Force "dist"
    }
    
    # Compilar
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al compilar el proyecto" -ForegroundColor Red
        exit 1
    }
    
    # Verificar que dist existe
    if (-not (Test-Path "dist")) {
        Write-Host "❌ Error: La carpeta dist no se creó" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Compilación exitosa" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Omitiendo compilación (usando build existente)" -ForegroundColor Yellow
    Write-Host ""
}

# Verificar que dist existe
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: La carpeta dist no existe. Ejecuta 'npm run build' primero." -ForegroundColor Red
    exit 1
}

# Verificar que Dockerfile existe
if (-not (Test-Path "Dockerfile-cloudrun")) {
    Write-Host "❌ Error: Dockerfile-cloudrun no existe" -ForegroundColor Red
    exit 1
}

# Verificar que nginx-cloudrun.conf existe
if (-not (Test-Path "nginx-cloudrun.conf")) {
    Write-Host "❌ Error: nginx-cloudrun.conf no existe" -ForegroundColor Red
    exit 1
}

# Build y deploy usando Cloud Build
Write-Host "🚀 Iniciando build y deploy a Cloud Run..." -ForegroundColor Cyan
Write-Host "   Esto puede tardar 5-10 minutos..." -ForegroundColor Yellow
Write-Host ""

$buildResult = gcloud builds submit --config cloudbuild.yaml 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Despliegue exitoso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Obtener URL del servicio
    Write-Host "🔍 Obteniendo información del servicio..." -ForegroundColor Cyan
    $serviceUrl = gcloud run services describe eduspark-frontend --region $Region --format 'value(status.url)' 2>$null
    
    if ($serviceUrl) {
        Write-Host ""
        Write-Host "🌐 URL del servicio:" -ForegroundColor Green
        Write-Host "   $serviceUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "📝 Comandos útiles:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   Ver logs:" -ForegroundColor Yellow
        Write-Host "   gcloud run services logs read eduspark-frontend --region $Region" -ForegroundColor White
        Write-Host ""
        Write-Host "   Ver información del servicio:" -ForegroundColor Yellow
        Write-Host "   gcloud run services describe eduspark-frontend --region $Region" -ForegroundColor White
        Write-Host ""
        Write-Host "   Actualizar variables de entorno:" -ForegroundColor Yellow
        Write-Host "   gcloud run services update eduspark-frontend --region $Region --set-env-vars 'KEY=value'" -ForegroundColor White
        Write-Host ""
        Write-Host "   Abrir en el navegador:" -ForegroundColor Yellow
        Write-Host "   start $serviceUrl" -ForegroundColor White
        Write-Host ""
        
        # Preguntar si quiere abrir en el navegador
        $open = Read-Host "¿Abrir en el navegador? (S/N)"
        if ($open -eq "S" -or $open -eq "s" -or $open -eq "Y" -or $open -eq "y") {
            Start-Process $serviceUrl
        }
    } else {
        Write-Host "⚠️  Advertencia: No se pudo obtener la URL del servicio" -ForegroundColor Yellow
        Write-Host "   Verifica manualmente en: https://console.cloud.google.com/run" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ Error en el despliegue" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa los logs arriba para más detalles" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para ver logs detallados:" -ForegroundColor Cyan
    Write-Host "   gcloud builds log --stream" -ForegroundColor White
    exit 1
}
