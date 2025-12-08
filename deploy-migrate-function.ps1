# Script para desplegar la función migrate-drive-to-bucket de Supabase
# Ejecutar desde el directorio raíz del proyecto

Write-Host "🚀 Desplegando función migrate-drive-to-bucket en Supabase..." -ForegroundColor Cyan

# Verificar si supabase CLI está instalado
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    supabase functions deploy migrate-drive-to-bucket --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Función desplegada exitosamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al desplegar la función" -ForegroundColor Red
        Write-Host "Asegúrate de haber iniciado sesión con 'supabase login'" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Supabase CLI no encontrado." -ForegroundColor Red
    Write-Host "Por favor instala Supabase CLI o despliega la función manualmente:" -ForegroundColor Yellow
    Write-Host "npx supabase functions deploy migrate-drive-to-bucket --no-verify-jwt" -ForegroundColor White
}
