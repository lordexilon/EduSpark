# =====================================================================
# Orquestador de Servicios Locales: EduSpark Dev Environment
# =====================================================================
# Script para iniciar, controlar y monitorear todos los subprocesos
# de desarrollo (Supabase, Deno Edge Functions y Vite Dev Server).
#
# Uso: .\eduspark-dev.ps1
# =====================================================================

$Host.UI.RawHostHeader = "EduSpark Dev Controller v1.0"
Clear-Host

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "     EDUSPARK LOCAL ORCHESTRATOR (SCA v3.0)          " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# --- 0. Limpiar relay de WSL para liberar puertos de Docker ---
Write-Host "[WSL] 0. Limpiando WSL relay para evitar conflictos de puertos..." -ForegroundColor Yellow
try {
    wsl --shutdown 2>$null
    Start-Sleep -Seconds 3
    Write-Host "   [OK] WSL relay limpiado. Puertos de Docker liberados." -ForegroundColor Green
} catch {
    Write-Host "   [WARN] WSL no disponible o ya estaba apagado. Continuando..." -ForegroundColor DarkYellow
}

# --- 1. Verificar si Docker está corriendo ---
Write-Host "[DOCKER] 1. Verificando estado de Docker Daemon..." -ForegroundColor Yellow
$dockerCheck = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue

if (-not $dockerCheck -and -not (docker info 2>$null)) {
    Write-Host "[ERROR] Docker no esta en ejecucion. Por favor, inicia Docker Desktop antes de continuar." -ForegroundColor Red
    Exit 1
}
Write-Host "   [OK] Docker Daemon esta activo." -ForegroundColor Green

# --- 1.5. Detectar ejecutable de Supabase CLI (Global o Local via npx) ---
$supabaseCmd = "supabase"
$supabaseArgs = @()

if (-not (Get-Command "supabase" -ErrorAction SilentlyContinue)) {
    if (Get-Command "npx" -ErrorAction SilentlyContinue) {
        Write-Host "   [INFO] Supabase CLI global no encontrada. Utilizando 'npx -y supabase'..." -ForegroundColor Gray
        $supabaseCmd = "npx"
        $supabaseArgs = @("-y", "supabase")
    } else {
        Write-Host "[ERROR] Supabase CLI no encontrada. Por favor instala la CLI ejecutando: npm install -g supabase" -ForegroundColor Red
        Exit 1
    }
}

# --- 2. Iniciar Supabase Local ---
Write-Host "" -ForegroundColor Gray
Write-Host "[DATABASE] 2. Verificando estado de Supabase Local..." -ForegroundColor Yellow

# Verificar si el puerto de la API de Supabase (54331) ya responde para saltar la CLI bloqueante
$supabasePortActive = Test-NetConnection -ComputerName "localhost" -Port 54331 -InformationLevel Quiet

if ($supabasePortActive) {
    Write-Host "   [OK] Supabase ya se encuentra corriendo (API activa en puerto 54331)." -ForegroundColor Green
} else {
    Write-Host "   [INIT] Supabase inactivo en puerto 54331. Iniciando contenedores..." -ForegroundColor Yellow
    & $supabaseCmd $supabaseArgs start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error al iniciar Supabase local. Revisa los logs de Docker o ejecuta: npx -y supabase start" -ForegroundColor Red
        Exit 1
    }
    Write-Host "   [OK] Supabase levantado con exito." -ForegroundColor Green
}

# Crear carpeta de logs si no existe
$logDir = Join-Path $PSScriptRoot ".agent/scratch"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}

$functionsLog = Join-Path $logDir "supabase-functions.log"
$functionsErrLog = Join-Path $logDir "supabase-functions-error.log"
$viteLog = Join-Path $logDir "vite-dev.log"
$viteErrLog = Join-Path $logDir "vite-dev-error.log"

# Limpiar archivos de logs antiguos
if (Test-Path $functionsLog) { Remove-Item $functionsLog -Force }
if (Test-Path $functionsErrLog) { Remove-Item $functionsErrLog -Force }
if (Test-Path $viteLog) { Remove-Item $viteLog -Force }
if (Test-Path $viteErrLog) { Remove-Item $viteErrLog -Force }

# --- 3. Levantar Supabase Edge Functions (Deno) ---
Write-Host "" -ForegroundColor Gray
Write-Host "[FUNCTIONS] 3. Iniciando Supabase Edge Functions Deno..." -ForegroundColor Yellow
Write-Host "   Logs redirigidos a: .agent/scratch/supabase-functions.log" -ForegroundColor Gray

# Detener instancias anteriores de functions serve para evitar puertos tomados
Stop-Process -Name "supabase" -ErrorAction SilentlyContinue

$cmdArgs = "/c npx -y supabase functions serve --env-file .env --no-verify-jwt > `"$functionsLog`" 2> `"$functionsErrLog`""
if ($supabaseCmd -eq "supabase") {
    $cmdArgs = "/c supabase functions serve --env-file .env --no-verify-jwt > `"$functionsLog`" 2> `"$functionsErrLog`""
}

Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -NoNewWindow

# --- 4. Levantar Servidor de Desarrollo de Vite ---
Write-Host "" -ForegroundColor Gray
Write-Host "[FRONTEND] 4. Iniciando Servidor de Desarrollo de Vite..." -ForegroundColor Yellow
Write-Host "   Logs redirigidos a: .agent/scratch/vite-dev.log y vite-dev-error.log" -ForegroundColor Gray

Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev > `"$viteLog`" 2> `"$viteErrLog`"" -NoNewWindow

# --- 5. Esperar inicialización y chequear puertos ---
Write-Host "" -ForegroundColor Gray
Write-Host "[DIAGNOSTIC] 5. Ejecutando diagnostico de puertos y salud del entorno..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$ports = @{
    "54331" = "Supabase API REST"
    "54393" = "Supabase Studio DB Manager"
    "54321" = "Deno Edge Functions Gateway"
    "5173"  = "Vite Dev Server Frontend"
}

$allOk = $true
Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
foreach ($port in $ports.Keys) {
    $connection = Test-NetConnection -ComputerName "localhost" -Port $port -InformationLevel Quiet
    if ($connection) {
        Write-Host "   [OK]  Puerto $port -> $($ports[$port])" -ForegroundColor Green
    } else {
        Write-Host "   [ERR] Puerto $port -> $($ports[$port]) (Iniciando...)" -ForegroundColor Yellow
        $allOk = $false
    }
}
Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray

# --- 6. Mostrar Dashboard de Control ---
Write-Host "" -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "        ENTORNO LOCAL DE EDUSPARK LISTO!             " -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "-> Supabase Studio:  http://localhost:54393" -ForegroundColor Cyan
Write-Host "-> Frontend React:   http://localhost:5173" -ForegroundColor Cyan
Write-Host "-> Gateway IA API:   http://localhost:54321/functions/v1/eduspark-gateway" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "* Para ver los logs de las Edge Functions en vivo:" -ForegroundColor Yellow
Write-Host "   Get-Content -Path .agent/scratch/supabase-functions.log -Wait" -ForegroundColor Gray
Write-Host "" -ForegroundColor Gray
Write-Host "* Para ver los logs de Vite:" -ForegroundColor Yellow
Write-Host "   Get-Content -Path .agent/scratch/vite-dev.log -Wait" -ForegroundColor Gray
Write-Host "" -ForegroundColor Gray
Write-Host "* Para apagar el entorno y liberar puertos:" -ForegroundColor Yellow
Write-Host "   Stop-Job *; $(($supabaseCmd + ' ' + ($supabaseArgs -join ' ')).Trim()) stop; Stop-Process -Name node -Force" -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Green
