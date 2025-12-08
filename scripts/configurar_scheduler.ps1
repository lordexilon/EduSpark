# Script PowerShell para configurar Cloud Scheduler en Windows
# Uso: .\scripts\configurar_scheduler.ps1

Write-Host "🔍 Verificando configuración del Cloud Scheduler..." -ForegroundColor Cyan
Write-Host ""

# Verificar si existe el scheduler
$schedulerExists = gcloud scheduler jobs list --location=us-central1 --format="value(name)" --filter="name:rag-worker-scheduler" 2>$null

if ([string]::IsNullOrEmpty($schedulerExists)) {
    Write-Host "⚠️  Cloud Scheduler no encontrado" -ForegroundColor Yellow
    Write-Host ""
    $create = Read-Host "¿Deseas crear el Cloud Scheduler ahora? (s/n)"
    
    if ($create -eq "s" -or $create -eq "S") {
        Write-Host ""
        Write-Host "📝 Creando Cloud Scheduler..." -ForegroundColor Cyan
        
        gcloud scheduler jobs create http rag-worker-scheduler `
            --location=us-central1 `
            --schedule="*/2 * * * *" `
            --uri="https://us-central1-eduspark-py.cloudfunctions.net/rag-worker" `
            --http-method=POST `
            --headers="Content-Type=application/json" `
            --message-body='{"action":"processPendingJobs"}' `
            --time-zone="America/Montevideo" `
            --attempt-deadline=540s `
            --max-retry-attempts=3 `
            --min-backoff-duration=10s `
            --max-backoff-duration=300s
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Cloud Scheduler creado exitosamente" -ForegroundColor Green
        } else {
            Write-Host "❌ Error creando Cloud Scheduler" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "⏭️  Saltando creación del scheduler"
    }
} else {
    Write-Host "✅ Cloud Scheduler encontrado: rag-worker-scheduler" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Detalles del scheduler:"
    gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1
}

Write-Host ""
Write-Host "✅ Configuración completada" -ForegroundColor Green

