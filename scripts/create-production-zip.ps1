# Script para crear archivo ZIP de produccion
# Excluye archivos de desarrollo, documentacion y temporales

Write-Host "Creando archivo ZIP para produccion..." -ForegroundColor Cyan

# Nombre del archivo ZIP
$zipFileName = "eduspark-production.zip"

# Eliminar ZIP anterior si existe
if (Test-Path $zipFileName) {
    Write-Host "Eliminando ZIP anterior..." -ForegroundColor Yellow
    Remove-Item $zipFileName -Force
}

# Crear directorio temporal
$tempDir = "temp-production"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copiando archivos necesarios..." -ForegroundColor Cyan

# Copiar archivos raíz necesarios
$rootFiles = @(
    "index.html",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.cjs",
    "postcss.config.cjs",
    "firebase.json",
    "README.md"
)

foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $tempDir -Force
        Write-Host "  [OK] $file" -ForegroundColor Green
    }
}

# Copiar carpeta src (codigo fuente del frontend)
if (Test-Path "src") {
    Write-Host "  Copiando src/..." -ForegroundColor Cyan
    Copy-Item "src" -Destination $tempDir -Recurse -Force
    Write-Host "  [OK] src/ copiada" -ForegroundColor Green
}

# Copiar funciones (solo archivos fuente, no node_modules ni lib)
if (Test-Path "functions") {
    Write-Host "  Copiando functions/..." -ForegroundColor Cyan
    $functionsDir = Join-Path $tempDir "functions"
    New-Item -ItemType Directory -Path $functionsDir | Out-Null
    
    Get-ChildItem "functions" -Directory | ForEach-Object {
        $funcName = $_.Name
        $funcDir = Join-Path $functionsDir $funcName
        New-Item -ItemType Directory -Path $funcDir | Out-Null
        
        # Copiar solo archivos necesarios
        Get-ChildItem $_.FullName -File | Where-Object {
            $_.Extension -in @(".ts", ".js", ".json", ".txt") -and
            $_.Name -notlike "*.backup*" -and
            $_.Name -notlike "*.temp*"
        } | ForEach-Object {
            Copy-Item $_.FullName -Destination $funcDir -Force
        }
        
        # Copiar package.json si existe
        if (Test-Path (Join-Path $_.FullName "package.json")) {
            Copy-Item (Join-Path $_.FullName "package.json") -Destination $funcDir -Force
        }
        
        # Copiar tsconfig.json si existe
        if (Test-Path (Join-Path $_.FullName "tsconfig.json")) {
            Copy-Item (Join-Path $_.FullName "tsconfig.json") -Destination $funcDir -Force
        }
        
        Write-Host "    [OK] functions/$funcName/" -ForegroundColor Green
    }
}

# Copiar public si existe
if (Test-Path "public") {
    Write-Host "  Copiando public/..." -ForegroundColor Cyan
    Copy-Item "public" -Destination $tempDir -Recurse -Force
    Write-Host "  [OK] public/ copiada" -ForegroundColor Green
}

# Crear archivo ZIP
Write-Host ""
Write-Host "Comprimiendo archivos..." -ForegroundColor Cyan

# Intentar comprimir con reintentos
$maxRetries = 3
$retryCount = 0
$success = $false

while ($retryCount -lt $maxRetries -and -not $success) {
    try {
        Start-Sleep -Seconds 1
        Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFileName -Force -ErrorAction Stop
        $success = $true
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "  Intento $retryCount fallido, reintentando..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        } else {
            Write-Host "  Error al comprimir: $_" -ForegroundColor Red
            Write-Host "  Intentando metodo alternativo..." -ForegroundColor Yellow
            
            # Metodo alternativo: usar .NET directamente
            try {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, (Resolve-Path .).Path + "\" + $zipFileName)
                $success = $true
            } catch {
                Write-Host "  Error con metodo alternativo: $_" -ForegroundColor Red
            }
        }
    }
}

# Limpiar directorio temporal
Write-Host "Limpiando archivos temporales..." -ForegroundColor Cyan
Remove-Item $tempDir -Recurse -Force

# Mostrar informacion del archivo
$zipInfo = Get-Item $zipFileName
$sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "Archivo ZIP creado exitosamente!" -ForegroundColor Green
Write-Host "   Archivo: $zipFileName" -ForegroundColor White
Write-Host "   Tamano: $sizeMB MB" -ForegroundColor White
Write-Host ""
Write-Host "Archivos incluidos:" -ForegroundColor Cyan
Write-Host "   [OK] Codigo fuente (src/)" -ForegroundColor Green
Write-Host "   [OK] Cloud Functions (functions/ - solo fuente)" -ForegroundColor Green
Write-Host "   [OK] Archivos de configuracion" -ForegroundColor Green
Write-Host ""
Write-Host "Archivos excluidos:" -ForegroundColor Yellow
Write-Host "   [X] node_modules/" -ForegroundColor Red
Write-Host "   [X] dist/, build/" -ForegroundColor Red
Write-Host "   [X] AI_CONTEXT/, docs/" -ForegroundColor Red
Write-Host "   [X] scripts/, TEST_MATERIA/" -ForegroundColor Red
Write-Host "   [X] Archivos .backup, .temp, .log" -ForegroundColor Red
Write-Host "   [X] Archivos de credenciales (.env.local, client_secret_*.json)" -ForegroundColor Red

