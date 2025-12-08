# Script de verificación pre-deployment
# Verifica que todo esté listo antes de subir a Google Cloud

param(
    [string]$ProjectId = "eduspark-py",
    [string]$Region = "us-central1",
    [string]$ServiceName = "eduspark-frontend"
)

$ErrorActionPreference = "Continue"
$allGood = $true

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🔍 Verificación Pre-Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar gcloud CLI
Write-Info "1. Verificando gcloud CLI..."
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Success "gcloud CLI instalado: $gcloudVersion"
} catch {
    Write-Error "gcloud CLI no está instalado"
    Write-Info "Instala desde: https://cloud.google.com/sdk/docs/install"
    $allGood = $false
}

# 2. Verificar autenticación
Write-Host ""
Write-Info "2. Verificando autenticación..."
try {
    $account = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>&1
    if ($account) {
        Write-Success "Autenticado como: $account"
    } else {
        Write-Warning "No hay autenticación activa"
        Write-Info "Ejecuta: gcloud auth login"
        $allGood = $false
    }
} catch {
    Write-Error "Error verificando autenticación"
    $allGood = $false
}

# 3. Verificar proyecto
Write-Host ""
Write-Info "3. Verificando proyecto..."
try {
    $currentProject = gcloud config get-value project 2>&1
    if ($currentProject -eq $ProjectId) {
        Write-Success "Proyecto configurado: $currentProject"
    } else {
        Write-Warning "Proyecto actual: $currentProject (esperado: $ProjectId)"
        Write-Info "Configurando proyecto a $ProjectId..."
        gcloud config set project $ProjectId 2>&1 | Out-Null
        Write-Success "Proyecto configurado a $ProjectId"
    }
} catch {
    Write-Error "Error configurando proyecto"
    $allGood = $false
}

# 4. Verificar APIs habilitadas
Write-Host ""
Write-Info "4. Verificando APIs habilitadas..."
$requiredAPIs = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "containerregistry.googleapis.com"
)

foreach ($api in $requiredAPIs) {
    try {
        $enabled = gcloud services list --enabled --filter="name:$api" --format="value(name)" 2>&1
        if ($enabled -match $api) {
            Write-Success "API $api habilitada"
        } else {
            Write-Warning "API $api NO habilitada"
            Write-Info "Ejecuta: gcloud services enable $api --project=$ProjectId"
        }
    } catch {
        Write-Warning "No se pudo verificar API $api"
    }
}

# 5. Verificar archivos necesarios
Write-Host ""
Write-Info "5. Verificando archivos necesarios..."
$requiredFiles = @(
    "Dockerfile-cloudrun",
    "cloudbuild.yaml",
    "nginx-cloudrun.conf",
    "start-nginx.sh",
    "package.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "Archivo encontrado: $file"
    } else {
        Write-Error "Archivo faltante: $file"
        $allGood = $false
    }
}

# 6. Verificar que el build funciona localmente (opcional)
Write-Host ""
Write-Info "6. Verificando estructura del proyecto..."
if (Test-Path "src") {
    Write-Success "Directorio src encontrado"
} else {
    Write-Error "Directorio src no encontrado"
    $allGood = $false
}

if (Test-Path "package.json") {
    Write-Success "package.json encontrado"
} else {
    Write-Error "package.json no encontrado"
    $allGood = $false
}

# 7. Verificar estado del servicio actual (si existe)
Write-Host ""
Write-Info "7. Verificando servicio actual en Cloud Run..."
try {
    $service = gcloud run services describe $ServiceName --region=$Region --format="json" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $serviceObj = $service | ConvertFrom-Json
        $currentUrl = $serviceObj.status.url
        Write-Success "Servicio encontrado: $ServiceName"
        Write-Info "URL actual: $currentUrl"
        Write-Info "Última revisión: $($serviceObj.status.latestReadyRevisionName)"
    } else {
        Write-Warning "Servicio $ServiceName no existe aún (se creará en el primer deployment)"
    }
} catch {
    Write-Warning "No se pudo verificar el servicio (puede que no exista aún)"
}

# 8. Verificar Dockerfile
Write-Host ""
Write-Info "8. Verificando Dockerfile..."
if (Test-Path "Dockerfile-cloudrun") {
    $dockerfileContent = Get-Content "Dockerfile-cloudrun" -Raw
    if ($dockerfileContent -match "VITE_GEMINI_API_KEY") {
        Write-Success "Dockerfile contiene variables de entorno configuradas"
    } else {
        Write-Warning "Dockerfile podría no tener todas las variables configuradas"
    }
} else {
    Write-Error "Dockerfile-cloudrun no encontrado"
    $allGood = $false
}

# 9. Resumen
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($allGood) {
    Write-Success "✅ Verificación completada - Listo para deployment"
    Write-Host ""
    Write-Info "Para hacer el deployment, ejecuta:"
    Write-Host "   .\deploy-cloudrun.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Info "O con Cloud Build:"
    Write-Host "   gcloud builds submit --config cloudbuild.yaml" -ForegroundColor Yellow
} else {
    Write-Warning "⚠ Algunos problemas encontrados. Revisa los mensajes arriba."
    Write-Host ""
    Write-Info "Corrige los problemas antes de hacer el deployment."
}

Write-Host ""
Write-Host "Proyecto: $ProjectId" -ForegroundColor Cyan
Write-Host "Región: $Region" -ForegroundColor Cyan
Write-Host "Servicio: $ServiceName" -ForegroundColor Cyan
Write-Host ""







