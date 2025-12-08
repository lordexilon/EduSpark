# Script de despliegue para rag-worker
# Ejecutar desde: functions/rag-worker/

Write-Host "🚀 Desplegando rag-worker..." -ForegroundColor Cyan
Write-Host ""

# Variables de entorno (usar las mismas que están en firebase.json)
$SUPABASE_URL = "https://mckfscukxcqwntpjagar.supabase.co"
$SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8"

# Obtener GEMINI_API_KEY de variables de entorno o solicitar
$GEMINI_API_KEY = $env:GEMINI_API_KEY
if (-not $GEMINI_API_KEY) {
    Write-Host "⚠️ GEMINI_API_KEY no encontrada en variables de entorno" -ForegroundColor Yellow
    Write-Host "Por favor, ingresa tu GEMINI_API_KEY o configúrala como variable de entorno" -ForegroundColor Yellow
    $GEMINI_API_KEY = Read-Host "GEMINI_API_KEY"
    if (-not $GEMINI_API_KEY) {
        Write-Host "❌ Error: GEMINI_API_KEY es requerida para el deploy" -ForegroundColor Red
        exit 1
    }
}

Write-Host "📋 Configuración:" -ForegroundColor Yellow
Write-Host "  - Runtime: nodejs20"
Write-Host "  - Region: us-central1"
Write-Host "  - Memory: 4GB"
Write-Host "  - Timeout: 3600s"
Write-Host "  - Max Instances: 10"
Write-Host ""

Write-Host "⏳ Iniciando despliegue (esto puede tardar varios minutos)..." -ForegroundColor Yellow
Write-Host ""

# Comando de despliegue
gcloud functions deploy rag-worker `
  --gen2 `
  --runtime=nodejs20 `
  --region=us-central1 `
  --source=. `
  --entry-point=processRagJobs `
  --trigger-http `
  --allow-unauthenticated `
  --timeout=3600s `
  --memory=4GB `
  --max-instances=10 `
  --project=eduspark-py `
  --set-env-vars="SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY,GEMINI_API_KEY=$GEMINI_API_KEY" `
  2>&1 | Tee-Object -Variable deployOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Espera 2-3 minutos para que el scheduler procese jobs pendientes"
    Write-Host "2. Verifica los logs: gcloud functions logs read rag-worker --limit=20"
    Write-Host "3. Prueba invocación manual si es necesario"
} else {
    Write-Host ""
    Write-Host "❌ Error en el despliegue" -ForegroundColor Red
    Write-Host "Revisa la salida anterior para más detalles"
    Write-Host ""
    Write-Host "Salida del comando:"
    Write-Host $deployOutput
}
