# Script de deployment para Google Cloud (PowerShell)
# Uso: .\deploy-google-cloud.ps1 [frontend|worker|all]

param(
    [Parameter(Position=0)]
    [ValidateSet("frontend", "worker", "all")]
    [string]$Component = "all"
)

$ErrorActionPreference = "Stop"

$PROJECT_ID = "eduspark-py"
$REGION = "us-central1"
$FRONTEND_SERVICE = "eduspark-frontend"
$WORKER_SERVICE = "rag-processing-worker"

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

# Verificar que gcloud esté instalado
function Test-GCloud {
    try {
        $null = gcloud --version 2>&1
        Write-Success "gcloud CLI encontrado"
    } catch {
        Write-Error "gcloud CLI no está instalado"
        Write-Host "Instala desde: https://cloud.google.com/sdk/docs/install"
        exit 1
    }
}

# Verificar configuración del proyecto
function Test-Project {
    $currentProject = gcloud config get-value project 2>$null
    if ($currentProject -ne $PROJECT_ID) {
        Write-Warning "Proyecto actual: $currentProject"
        Write-Info "Configurando proyecto a $PROJECT_ID..."
        gcloud config set project $PROJECT_ID
    }
    Write-Success "Proyecto configurado: $PROJECT_ID"
}

# Verificar autenticación
function Test-Auth {
    $account = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null
    if (-not $account) {
        Write-Error "No hay autenticación activa"
        Write-Info "Ejecutando: gcloud auth login"
        gcloud auth login
    }
    Write-Success "Autenticación verificada"
}

# Habilitar APIs necesarias
function Enable-APIs {
    Write-Info "Verificando APIs necesarias..."
    
    $apis = @(
        "run.googleapis.com",
        "cloudbuild.googleapis.com",
        "containerregistry.googleapis.com",
        "secretmanager.googleapis.com"
    )
    
    foreach ($api in $apis) {
        $enabled = gcloud services list --enabled --filter="name:$api" --format="value(name)" 2>$null
        if ($enabled -match $api) {
            Write-Success "API $api ya está habilitada"
        } else {
            Write-Info "Habilitando API: $api..."
            gcloud services enable $api --project=$PROJECT_ID
            Write-Success "API $api habilitada"
        }
    }
}

# Deploy del frontend
function Deploy-Frontend {
    Write-Info "🚀 Desplegando frontend..."
    
    $imageName = "gcr.io/$PROJECT_ID/$FRONTEND_SERVICE"
    
    # Build y push con Cloud Build
    Write-Info "Construyendo imagen Docker..."
    try {
        gcloud builds submit --config cloudbuild.yaml --project $PROJECT_ID
        Write-Success "Build completado con Cloud Build"
    } catch {
        Write-Warning "Cloud Build falló, intentando método alternativo..."
        Write-Info "Usa: gcloud builds submit --config cloudbuild.yaml"
        return
    }
    
    # Obtener URL
    $frontendUrl = gcloud run services describe $FRONTEND_SERVICE `
        --platform managed `
        --region $REGION `
        --project $PROJECT_ID `
        --format "value(status.url)" 2>$null
    
    if ($frontendUrl) {
        Write-Success "Frontend desplegado exitosamente!"
        Write-Info "URL: $frontendUrl"
        $frontendUrl | Out-File -FilePath "frontend-url.txt" -Encoding utf8
    }
}

# Deploy del worker
function Deploy-Worker {
    Write-Info "🚀 Desplegando worker RAG..."
    
    Push-Location "src/workers/file-processing-worker"
    
    try {
        $imageName = "gcr.io/$PROJECT_ID/$WORKER_SERVICE"
        
        # Build y push
        Write-Info "Construyendo imagen Docker del worker..."
        gcloud builds submit --tag "$imageName`:latest" --project $PROJECT_ID
        
        # Deploy con secretos
        Write-Info "Desplegando worker a Cloud Run con secretos..."
        gcloud run deploy $WORKER_SERVICE `
            --image "$imageName`:latest" `
            --platform managed `
            --region $REGION `
            --project $PROJECT_ID `
            --memory 2Gi `
            --cpu 2 `
            --timeout 3600 `
            --max-instances 10 `
            --min-instances 0 `
            --set-secrets="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" `
            --set-env-vars="NODE_ENV=production" `
            --no-allow-unauthenticated
        
        Write-Success "Worker desplegado exitosamente!"
    } catch {
        Write-Warning "Deploy del worker falló. Verifica que los secretos existan."
        Write-Info "Listando secretos disponibles..."
        gcloud secrets list --project=$PROJECT_ID
    } finally {
        Pop-Location
    }
}

# Verificar secretos
function Test-Secrets {
    Write-Info "Verificando secretos necesarios..."
    
    $requiredSecrets = @(
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "GEMINI_API_KEY"
    )
    
    $missingSecrets = @()
    
    foreach ($secret in $requiredSecrets) {
        try {
            $null = gcloud secrets describe $secret --project=$PROJECT_ID 2>$null
            Write-Success "Secreto $secret encontrado"
        } catch {
            Write-Warning "Secreto $secret NO encontrado"
            $missingSecrets += $secret
        }
    }
    
    if ($missingSecrets.Count -gt 0) {
        Write-Error "Faltan los siguientes secretos:"
        foreach ($secret in $missingSecrets) {
            Write-Host "  - $secret"
        }
        Write-Info "Crea los secretos con:"
        Write-Host "  echo 'valor' | gcloud secrets create SECRET_NAME --data-file=- --project=$PROJECT_ID"
        return $false
    }
    
    return $true
}

# Función principal
function Main {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "🚀 Deployment a Google Cloud - EduSpark" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificaciones previas
    Test-GCloud
    Test-Auth
    Test-Project
    Enable-APIs
    
    switch ($Component) {
        "frontend" {
            Deploy-Frontend
        }
        "worker" {
            if (Test-Secrets) {
                Deploy-Worker
            } else {
                exit 1
            }
        }
        "all" {
            Deploy-Frontend
            Write-Host ""
            if (Test-Secrets) {
                Deploy-Worker
            } else {
                Write-Warning "Worker no desplegado. Crea los secretos y vuelve a ejecutar."
            }
        }
    }
    
    Write-Host ""
    Write-Success "✅ Deployment completado!"
    Write-Host ""
    Write-Info "📊 Verifica los servicios en:"
    Write-Host "   https://console.cloud.google.com/run?project=$PROJECT_ID"
}

# Ejecutar
Main

