# =====================================================
# Script para limpiar caché de forma agresiva
# Soluciona problemas de "Cargando" infinito
# =====================================================

Write-Host "🧹 Limpiando caché de forma agresiva..." -ForegroundColor Yellow

# 1. Detener procesos de Node/Vite
Write-Host "`n1️⃣ Deteniendo procesos de Node/Vite..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*vite*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Limpiar carpeta .vite-cache
Write-Host "2️⃣ Limpiando .vite-cache..." -ForegroundColor Cyan
if (Test-Path ".vite-cache") {
    Remove-Item ".vite-cache" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ .vite-cache eliminada" -ForegroundColor Green
}

# 3. Limpiar dist
Write-Host "3️⃣ Limpiando dist..." -ForegroundColor Cyan
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ dist eliminada" -ForegroundColor Green
}

# 4. Limpiar node_modules/.vite (si existe)
Write-Host "4️⃣ Limpiando node_modules/.vite..." -ForegroundColor Cyan
if (Test-Path "node_modules/.vite") {
    Remove-Item "node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ node_modules/.vite eliminada" -ForegroundColor Green
}

# 5. npm cache clean
Write-Host "5️⃣ Limpiando npm cache..." -ForegroundColor Cyan
npm cache clean --force
Write-Host "✅ npm cache limpiado" -ForegroundColor Green

# 6. Limpiar npm modules (opcional)
Write-Host "6️⃣ ¿Deseas eliminar y reinstalar node_modules? (esto toma tiempo)" -ForegroundColor Yellow
$response = Read-Host "Escribe 'si' para continuar, o presiona Enter para saltar"
if ($response -eq 'si') {
    Write-Host "Eliminando node_modules..." -ForegroundColor Cyan
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Reinstalando dependencias..." -ForegroundColor Cyan
    npm install
    Write-Host "✅ Dependencias reinstaladas" -ForegroundColor Green
}

Write-Host "`n✨ ¡Caché limpiado exitosamente!" -ForegroundColor Green
Write-Host "`nAhora ejecuta: npm run dev" -ForegroundColor Yellow
