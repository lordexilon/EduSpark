# Script para desplegar la función processFileJob
# Ejecutar desde el directorio raíz del proyecto

Write-Host "🔨 Compilando TypeScript..." -ForegroundColor Cyan
cd functions/processFileJob
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al compilar" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compilación exitosa" -ForegroundColor Green

cd ../..

Write-Host "🚀 Desplegando función processFileJob..." -ForegroundColor Cyan
firebase deploy --only functions --force

