# Script de diagnostico para problemas de login en Cloud Run

Write-Host "=== DIAGNOSTICO: Problema de Login en Cloud Run ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar archivo .env
Write-Host "1. Verificando archivo .env..." -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "   [OK] Archivo .env existe" -ForegroundColor Green
    $envContent = Get-Content .env -Raw
    if ($envContent -match 'VITE_SUPABASE_URL') {
        Write-Host "   [OK] VITE_SUPABASE_URL encontrada" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] VITE_SUPABASE_URL NO encontrada" -ForegroundColor Red
    }
    if ($envContent -match 'VITE_SUPABASE_ANON_KEY') {
        Write-Host "   [OK] VITE_SUPABASE_ANON_KEY encontrada" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] VITE_SUPABASE_ANON_KEY NO encontrada" -ForegroundColor Red
    }
} else {
    Write-Host "   [ERROR] Archivo .env NO existe" -ForegroundColor Red
}

Write-Host ""

# 2. Verificar .gcloudignore
Write-Host "2. Verificando .gcloudignore..." -ForegroundColor Yellow
if (Test-Path .gcloudignore) {
    $gcloudignoreContent = Get-Content .gcloudignore -Raw
    if ($gcloudignoreContent -match '^\.env$') {
        Write-Host "   [ADVERTENCIA] .env esta excluido en .gcloudignore" -ForegroundColor Red
        Write-Host "   Solucion: Comentar o eliminar la linea '.env' en .gcloudignore" -ForegroundColor Yellow
    } elseif ($gcloudignoreContent -match '^!\.env$') {
        Write-Host "   [OK] .env esta explicitamente incluido" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] .env no esta mencionado (se incluira por defecto)" -ForegroundColor Cyan
    }
} else {
    Write-Host "   [INFO] No existe .gcloudignore" -ForegroundColor Cyan
}

Write-Host ""

# 3. Verificar Dockerfile-cloudrun
Write-Host "3. Verificando Dockerfile-cloudrun..." -ForegroundColor Yellow
if (Test-Path Dockerfile-cloudrun) {
    $dockerfileContent = Get-Content Dockerfile-cloudrun -Raw
    if ($dockerfileContent -match 'COPY.*\.env') {
        Write-Host "   [OK] Dockerfile-cloudrun copia .env" -ForegroundColor Green
        $lines = Get-Content Dockerfile-cloudrun
        $lineNumber = 0
        foreach ($line in $lines) {
            $lineNumber++
            if ($line -match 'COPY.*\.env') {
                Write-Host "      Linea $lineNumber : $line" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "   [ERROR] Dockerfile-cloudrun NO copia .env" -ForegroundColor Red
        Write-Host "   Solucion: Agregar 'COPY .env ./' antes de 'RUN npm run build'" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERROR] Dockerfile-cloudrun NO existe" -ForegroundColor Red
}

Write-Host ""

# 4. Obtener URL del servicio
Write-Host "4. Obteniendo URL del servicio de Cloud Run..." -ForegroundColor Yellow
try {
    $serviceUrl = gcloud run services describe eduspark-frontend --region us-central1 --format="value(status.url)" 2>&1
    if ($LASTEXITCODE -eq 0 -and $serviceUrl) {
        Write-Host "   [OK] URL del servicio: $serviceUrl" -ForegroundColor Green
        Write-Host ""
        Write-Host "   [ACCION REQUERIDA] Configurar URLs en Supabase" -ForegroundColor Yellow
        Write-Host "   Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar" -ForegroundColor White
        Write-Host "   Authentication -> URL Configuration" -ForegroundColor White
        Write-Host "   Site URL: $serviceUrl" -ForegroundColor White
        Write-Host "   Redirect URLs (agregar cada una en una linea):" -ForegroundColor White
        Write-Host "     - $serviceUrl" -ForegroundColor Cyan
        Write-Host "     - $serviceUrl/**" -ForegroundColor Cyan
        Write-Host "     - $serviceUrl/auth/callback" -ForegroundColor Cyan
        Write-Host "     - $serviceUrl/auth/confirm" -ForegroundColor Cyan
    } else {
        Write-Host "   [ADVERTENCIA] No se pudo obtener la URL del servicio" -ForegroundColor Yellow
        Write-Host "   Verifica que el servicio este desplegado:" -ForegroundColor White
        Write-Host "   gcloud run services list --region us-central1" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   [ADVERTENCIA] Error obteniendo URL del servicio: $_" -ForegroundColor Yellow
}

Write-Host ""

# 5. Verificar valores hardcodeados en vite.config.ts
Write-Host "5. Verificando valores hardcodeados en vite.config.ts..." -ForegroundColor Yellow
if (Test-Path vite.config.ts) {
    $viteConfig = Get-Content vite.config.ts -Raw
    if ($viteConfig -match 'mckfscukxcqwntpjagar\.supabase\.co') {
        Write-Host "   [OK] URL de Supabase hardcodeada como fallback" -ForegroundColor Green
    } else {
        Write-Host "   [ADVERTENCIA] URL de Supabase no encontrada en vite.config.ts" -ForegroundColor Yellow
    }
    if ($viteConfig -match 'VITE_SUPABASE_ANON_KEY') {
        Write-Host "   [OK] ANON_KEY hardcodeada como fallback" -ForegroundColor Green
    } else {
        Write-Host "   [ADVERTENCIA] ANON_KEY no encontrada en vite.config.ts" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERROR] vite.config.ts NO existe" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "El problema mas probable es que las URLs de redirect no estan configuradas en Supabase." -ForegroundColor Yellow
Write-Host "Sigue los pasos en SOLUCION_CONEXION_SUPABASE.md para configurar las URLs." -ForegroundColor White
Write-Host ""
Write-Host "Si el problema persiste despues de configurar las URLs:" -ForegroundColor Yellow
Write-Host "1. Verifica la consola del navegador (F12) para ver errores especificos" -ForegroundColor White
Write-Host "2. Verifica los logs de Cloud Run: gcloud run services logs read eduspark-frontend --region us-central1" -ForegroundColor White
Write-Host "3. Verifica que el .env se este copiando correctamente en el build" -ForegroundColor White

