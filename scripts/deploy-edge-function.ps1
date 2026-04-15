# Script PowerShell para desplegar Edge Function
# Este script asegura que se ejecute desde el directorio correcto

$ErrorActionPreference = "Stop"

# Cambiar al directorio del proyecto
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

Write-Host "📁 Directorio de trabajo: $projectDir" -ForegroundColor Cyan
Write-Host "🚀 Desplegando Edge Function process-feedback..." -ForegroundColor Green

# Verificar que el archivo existe
$functionPath = Join-Path $projectDir "supabase\functions\process-feedback\index.ts"
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Error: No se encuentra el archivo $functionPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivo encontrado: $functionPath" -ForegroundColor Green

# Desplegar
supabase functions deploy process-feedback

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Edge Function desplegada exitosamente!" -ForegroundColor Green
} else {
    Write-Host "❌ Error al desplegar Edge Function" -ForegroundColor Red
    exit 1
}
