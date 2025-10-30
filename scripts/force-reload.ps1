# =====================================================
# Script de PowerShell para forzar recarga completa
# =====================================================

Write-Host "🚨 FORCE RELOAD - PowerShell Script" -ForegroundColor Red
Write-Host "=================================" -ForegroundColor Red

# Función para matar procesos de Node.js
Write-Host "🔄 Matando procesos de Node.js..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Procesos de Node.js terminados" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  No hay procesos de Node.js ejecutándose" -ForegroundColor Blue
}

# Función para matar procesos de Vite
Write-Host "🔄 Matando procesos de Vite..." -ForegroundColor Yellow
try {
    Get-Process -Name "vite" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Procesos de Vite terminados" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  No hay procesos de Vite ejecutándose" -ForegroundColor Blue
}

# Limpiar directorios de caché
Write-Host "🧹 Limpiando directorios de caché..." -ForegroundColor Yellow

$dirsToRemove = @(".vite-cache", "dist", "node_modules\.vite")

foreach ($dir in $dirsToRemove) {
    if (Test-Path $dir) {
        try {
            Remove-Item -Path $dir -Recurse -Force
            Write-Host "✅ Eliminado: $dir" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Error eliminando $dir : $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️  No existe: $dir" -ForegroundColor Blue
    }
}

# Limpiar caché de npm
Write-Host "🧽 Limpiando caché de npm..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "✅ Caché de npm limpiado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error limpiando caché de npm: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Limpiar variables de entorno temporales
Write-Host "🧹 Limpiando variables de entorno..." -ForegroundColor Yellow
$env:NODE_ENV = $null
$env:VITE_NODE_ENV = $null

Write-Host ""
Write-Host "✨ ¡Limpieza completa terminada!" -ForegroundColor Green
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
Write-Host ""

# Iniciar servidor
try {
    npm run dev
} catch {
    Write-Host "❌ Error iniciando servidor: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Intenta ejecutar manualmente: npm run dev" -ForegroundColor Yellow
}
