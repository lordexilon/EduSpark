# Script para verificar que todo está listo para el despliegue
# Uso: .\scripts\check-deployment-ready.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación Pre-Despliegue         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Verificar herramientas necesarias
Write-Host "🔍 Verificando herramientas..." -ForegroundColor Cyan

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    $errors += "gcloud CLI no está instalado"
} else {
    Write-Host "   ✅ gcloud CLI instalado" -ForegroundColor Green
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "      $gcloudVersion" -ForegroundColor Gray
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $errors += "Docker no está instalado"
} else {
    Write-Host "   ✅ Docker instalado" -ForegroundColor Green
    $dockerVersion = docker --version 2>&1
    Write-Host "      $dockerVersion" -ForegroundColor Gray
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $errors += "npm no está instalado"
} else {
    Write-Host "   ✅ npm instalado" -ForegroundColor Green
    $npmVersion = npm --version
    Write-Host "      v$npmVersion" -ForegroundColor Gray
}

Write-Host ""

# Verificar archivos necesarios
Write-Host "📁 Verificando archivos necesarios..." -ForegroundColor Cyan

$requiredFiles = @(
    "package.json",
    "vite.config.ts",
    "Dockerfile-cloudrun",
    "nginx-cloudrun.conf",
    "cloudbuild.yaml"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        $errors += "Archivo faltante: $file"
        Write-Host "   ❌ $file" -ForegroundColor Red
    }
}

Write-Host ""

# Verificar dependencias
Write-Host "📦 Verificando dependencias..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules existe" -ForegroundColor Green
} else {
    $warnings += "node_modules no existe. Ejecuta 'npm install' primero."
    Write-Host "   ⚠️  node_modules no existe" -ForegroundColor Yellow
}

if (Test-Path "package-lock.json") {
    Write-Host "   ✅ package-lock.json existe" -ForegroundColor Green
} else {
    $warnings += "package-lock.json no existe"
    Write-Host "   ⚠️  package-lock.json no existe" -ForegroundColor Yellow
}

Write-Host ""

# Verificar build
Write-Host "🔨 Verificando build..." -ForegroundColor Cyan

if (Test-Path "dist") {
    Write-Host "   ✅ dist existe" -ForegroundColor Green
    $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "      Tamaño: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray
    
    if (Test-Path "dist/index.html") {
        Write-Host "   ✅ dist/index.html existe" -ForegroundColor Green
    } else {
        $errors += "dist/index.html no existe"
        Write-Host "   ❌ dist/index.html no existe" -ForegroundColor Red
    }
} else {
    $warnings += "dist no existe. Ejecuta 'npm run build' primero."
    Write-Host "   ⚠️  dist no existe" -ForegroundColor Yellow
}

Write-Host ""

# Verificar configuración de gcloud
Write-Host "⚙️  Verificando configuración de gcloud..." -ForegroundColor Cyan

$currentProject = gcloud config get-value project 2>$null
if ($currentProject) {
    Write-Host "   ✅ Proyecto configurado: $currentProject" -ForegroundColor Green
} else {
    $warnings += "No hay proyecto configurado en gcloud"
    Write-Host "   ⚠️  No hay proyecto configurado" -ForegroundColor Yellow
}

$currentAccount = gcloud config get-value account 2>$null
if ($currentAccount) {
    Write-Host "   ✅ Cuenta configurada: $currentAccount" -ForegroundColor Green
} else {
    $warnings += "No hay cuenta configurada en gcloud"
    Write-Host "   ⚠️  No hay cuenta configurada" -ForegroundColor Yellow
}

Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Resumen                              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ Todo está listo para el despliegue!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para desplegar, ejecuta:" -ForegroundColor Cyan
    Write-Host "   .\scripts\deploy-google-cloud.ps1" -ForegroundColor White
    exit 0
} else {
    if ($errors.Count -gt 0) {
        Write-Host "❌ Errores encontrados:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "   • $error" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Advertencias:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   • $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    if ($errors.Count -gt 0) {
        Write-Host "❌ No se puede desplegar hasta corregir los errores" -ForegroundColor Red
        exit 1
    } else {
        Write-Host "⚠️  Hay advertencias, pero puedes intentar desplegar" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Para desplegar, ejecuta:" -ForegroundColor Cyan
        Write-Host "   .\scripts\deploy-google-cloud.ps1" -ForegroundColor White
        exit 0
    }
}

