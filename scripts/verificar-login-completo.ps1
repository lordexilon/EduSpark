# Script completo de verificacion de login para Cloud Run

param(
    [string]$Email = "albertovillalba@gmail.com"
)

Write-Host "=== VERIFICACION COMPLETA DE LOGIN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usuario a verificar: $Email" -ForegroundColor Yellow
Write-Host ""

# 1. Verificar configuracion local
Write-Host "1. Configuracion local..." -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "   [OK] Archivo .env existe" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Archivo .env NO existe" -ForegroundColor Red
}

# 2. Verificar URL del servicio
Write-Host "`n2. URL del servicio de Cloud Run..." -ForegroundColor Yellow
try {
    $serviceUrl = gcloud run services describe eduspark-frontend --region us-central1 --format="value(status.url)" 2>&1
    if ($LASTEXITCODE -eq 0 -and $serviceUrl) {
        Write-Host "   [OK] URL: $serviceUrl" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] No se pudo obtener la URL" -ForegroundColor Red
    }
} catch {
    Write-Host "   [ERROR] Error obteniendo URL: $_" -ForegroundColor Red
}

# 3. Verificar logs recientes de Cloud Run
Write-Host "`n3. Logs recientes de Cloud Run..." -ForegroundColor Yellow
Write-Host "   Obteniendo ultimos 20 logs..." -ForegroundColor Cyan
try {
    $logs = gcloud run services logs read eduspark-frontend --region us-central1 --limit 20 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Logs obtenidos" -ForegroundColor Green
        Write-Host "`n   Ultimos logs:" -ForegroundColor Cyan
        Write-Host "   $logs" -ForegroundColor White
    } else {
        Write-Host "   [ADVERTENCIA] No se pudieron obtener logs" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ADVERTENCIA] Error obteniendo logs: $_" -ForegroundColor Yellow
}

# 4. Instrucciones para verificar usuario en Supabase
Write-Host "`n4. Verificacion de usuario en Supabase..." -ForegroundColor Yellow
Write-Host "   Para verificar si el usuario existe, ejecuta el siguiente SQL en Supabase:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/sql/new" -ForegroundColor White
Write-Host ""
Write-Host "   -- Query 1: Verificar en public.users" -ForegroundColor Cyan
Write-Host "   SELECT id, email, first_name, last_name, role_id, is_active" -ForegroundColor White
Write-Host "   FROM public.users" -ForegroundColor White
Write-Host "   WHERE email = '$Email';" -ForegroundColor White
Write-Host ""
Write-Host "   -- Query 2: Verificar en auth.users" -ForegroundColor Cyan
Write-Host "   SELECT id, email, email_confirmed_at, last_sign_in_at" -ForegroundColor White
Write-Host "   FROM auth.users" -ForegroundColor White
Write-Host "   WHERE email = '$Email';" -ForegroundColor White

# 5. Verificar configuracion de Supabase
Write-Host "`n5. Configuracion de Supabase..." -ForegroundColor Yellow
Write-Host "   [ACCION REQUERIDA] Verifica que estas URLs esten configuradas en Supabase:" -ForegroundColor Yellow
Write-Host "   https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/auth/url-configuration" -ForegroundColor White
Write-Host ""
Write-Host "   Site URL:" -ForegroundColor Cyan
Write-Host "   $serviceUrl" -ForegroundColor White
Write-Host ""
Write-Host "   Redirect URLs (cada una en una linea):" -ForegroundColor Cyan
Write-Host "   $serviceUrl" -ForegroundColor White
Write-Host "   $serviceUrl/**" -ForegroundColor White
Write-Host "   $serviceUrl/auth/callback" -ForegroundColor White
Write-Host "   $serviceUrl/auth/confirm" -ForegroundColor White

# 6. Instrucciones para probar en navegador
Write-Host "`n6. Prueba en navegador..." -ForegroundColor Yellow
Write-Host "   1. Abre la aplicacion: $serviceUrl" -ForegroundColor White
Write-Host "   2. Abre la consola del navegador (F12 -> Console)" -ForegroundColor White
Write-Host "   3. Intenta iniciar sesion con: $Email" -ForegroundColor White
Write-Host "   4. Copia TODOS los errores de la consola y compartelos" -ForegroundColor White
Write-Host ""
Write-Host "   Busca especificamente estos errores:" -ForegroundColor Cyan
Write-Host "   - 'Invalid API key'" -ForegroundColor White
Write-Host "   - 'Invalid redirect URL'" -ForegroundColor White
Write-Host "   - 'Invalid login credentials'" -ForegroundColor White
Write-Host "   - 'User not found'" -ForegroundColor White
Write-Host "   - Errores 401 o 403" -ForegroundColor White

# 7. Verificar si localhost funciona
Write-Host "`n7. Verificacion de localhost..." -ForegroundColor Yellow
Write-Host "   Confirmas que el login funciona en localhost?" -ForegroundColor Cyan
Write-Host "   - Si funciona en localhost pero NO en Cloud Run: Problema de configuracion de URLs en Supabase" -ForegroundColor White
Write-Host "   - Si NO funciona en localhost tampoco: Problema con el usuario o credenciales" -ForegroundColor White

Write-Host "`n=== PROXIMOS PASOS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ejecuta el SQL en Supabase para verificar si el usuario existe" -ForegroundColor Yellow
Write-Host "2. Verifica que las URLs esten configuradas en Supabase" -ForegroundColor Yellow
Write-Host "3. Intenta iniciar sesion y copia los errores de la consola del navegador" -ForegroundColor Yellow
Write-Host "4. Comparte los resultados del SQL y los errores de la consola" -ForegroundColor Yellow
Write-Host ""

