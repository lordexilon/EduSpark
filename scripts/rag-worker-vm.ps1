# Scripts de PowerShell para gestionar RAG Worker VM
# Guardar en: $PROFILE (ejecutar: notepad $PROFILE)

# ========================================
# FUNCIONES PARA GESTIONAR LA VM
# ========================================

function Start-RagWorker {
    Write-Host "🚀 Encendiendo RAG Worker VM..." -ForegroundColor Green
    gcloud compute instances start rag-worker-vm --zone=us-central1-a --project=eduspark-py
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ VM encendida exitosamente" -ForegroundColor Green
        Write-Host "⏳ Espera 2 minutos antes de procesar archivos..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Tip: Ejecuta 'Status-RagWorker' para verificar el estado" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error al encender la VM" -ForegroundColor Red
    }
}

function Stop-RagWorker {
    Write-Host "🛑 Apagando RAG Worker VM..." -ForegroundColor Yellow
    gcloud compute instances stop rag-worker-vm --zone=us-central1-a --project=eduspark-py
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ VM apagada exitosamente" -ForegroundColor Green
        Write-Host "💰 Ahorrando dinero mientras está apagada" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error al apagar la VM" -ForegroundColor Red
    }
}

function Status-RagWorker {
    Write-Host "🔍 Verificando estado de la VM..." -ForegroundColor Cyan
    $status = gcloud compute instances describe rag-worker-vm --zone=us-central1-a --project=eduspark-py --format="value(status)"
    
    if ($status -eq "RUNNING") {
        Write-Host "✅ Estado: RUNNING (Encendida)" -ForegroundColor Green
        Write-Host "💡 Puedes procesar archivos ahora" -ForegroundColor Cyan
    } elseif ($status -eq "TERMINATED") {
        Write-Host "🛑 Estado: STOPPED (Apagada)" -ForegroundColor Yellow
        Write-Host "💡 Ejecuta 'Start-RagWorker' para encenderla" -ForegroundColor Cyan
    } else {
        Write-Host "⏳ Estado: $status" -ForegroundColor Yellow
    }
}

function Connect-RagWorker {
    Write-Host "🔌 Conectando a RAG Worker VM..." -ForegroundColor Cyan
    gcloud compute ssh rag-worker-vm --zone=us-central1-a --project=eduspark-py
}

function Logs-RagWorker {
    Write-Host "📋 Mostrando logs del RAG Worker..." -ForegroundColor Cyan
    Write-Host "💡 Presiona Ctrl+C para salir" -ForegroundColor Yellow
    Write-Host ""
    gcloud compute ssh rag-worker-vm --zone=us-central1-a --project=eduspark-py --command="sudo journalctl -u rag-worker -f"
}

function Info-RagWorker {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "          RAG WORKER VM - INFORMACIÓN" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Comandos Disponibles:" -ForegroundColor Green
    Write-Host "  Start-RagWorker    - Encender la VM" -ForegroundColor White
    Write-Host "  Stop-RagWorker     - Apagar la VM" -ForegroundColor White
    Write-Host "  Status-RagWorker   - Ver estado de la VM" -ForegroundColor White
    Write-Host "  Connect-RagWorker  - Conectarse por SSH" -ForegroundColor White
    Write-Host "  Logs-RagWorker     - Ver logs en tiempo real" -ForegroundColor White
    Write-Host "  Info-RagWorker     - Mostrar esta ayuda" -ForegroundColor White
    Write-Host ""
    Write-Host "💰 Costos:" -ForegroundColor Green
    Write-Host "  Encendida: `$0.040/hora" -ForegroundColor White
    Write-Host "  Apagada:   `$0.00/hora ✅" -ForegroundColor Green
    Write-Host "  Disco:     `$5/mes (siempre)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Workflow Recomendado:" -ForegroundColor Green
    Write-Host "  1. Start-RagWorker" -ForegroundColor White
    Write-Host "  2. Esperar 2 minutos" -ForegroundColor White
    Write-Host "  3. Procesar archivos desde el frontend" -ForegroundColor White
    Write-Host "  4. Stop-RagWorker" -ForegroundColor White
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

# Mostrar información al cargar el perfil
Write-Host ""
Write-Host "✅ Scripts de RAG Worker cargados" -ForegroundColor Green
Write-Host "💡 Ejecuta 'Info-RagWorker' para ver comandos disponibles" -ForegroundColor Cyan
Write-Host ""
