# Script para limpiar caché de Vite en Windows
# Ejecutar cuando haya problemas de EPERM

Write-Host "🧹 Limpiando caché de Vite..." -ForegroundColor Cyan

# Detener procesos de Node/Vite
Write-Host "`n🛑 Deteniendo procesos de Node/Vite..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*vite*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Eliminar directorios de caché
Write-Host "`n🗑️ Eliminando directorios de caché..." -ForegroundColor Yellow

$directories = @(
    "node_modules\.vite",
    ".vite-cache",
    "node_modules\.vite\deps",
    ".vite"
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
            Write-Host "  ✅ Eliminado: $dir" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Error eliminando $dir : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚪ No existe: $dir" -ForegroundColor Gray
    }
}

# Limpiar caché de npm
Write-Host "`n🧹 Limpiando caché de npm..." -ForegroundColor Yellow
npm cache clean --force | Out-Null
Write-Host "  ✅ Caché de npm limpiado" -ForegroundColor Green

Write-Host "`n✅ Limpieza completada!" -ForegroundColor Green
Write-Host "`n🚀 Ahora puedes ejecutar: npm run dev" -ForegroundColor Cyan
