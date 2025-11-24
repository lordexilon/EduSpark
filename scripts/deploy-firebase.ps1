# Script PowerShell para desplegar Firebase (Firestore + Cloud Functions)

Write-Host "🔥 Iniciando despliegue de Firebase..." -ForegroundColor Cyan

# Verificar que Firebase CLI está instalado
try {
    firebase --version | Out-Null
} catch {
    Write-Host "❌ Firebase CLI no está instalado. Instálalo con: npm install -g firebase-tools" -ForegroundColor Red
    exit 1
}

# Verificar autenticación
Write-Host "🔐 Verificando autenticación..." -ForegroundColor Yellow
$authCheck = firebase projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No estás autenticado. Ejecutando firebase login..." -ForegroundColor Yellow
    firebase login
}

# Desplegar reglas de Firestore
Write-Host "📜 Desplegando reglas de Firestore..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

# Desplegar índices de Firestore
Write-Host "📊 Desplegando índices de Firestore..." -ForegroundColor Yellow
firebase deploy --only firestore:indexes

# Instalar dependencias de las funciones
Write-Host "📦 Instalando dependencias de Cloud Functions..." -ForegroundColor Yellow
Set-Location functions/analyzeFile
npm install
npm run build
Set-Location ../createFileProcessingJob
npm install
npm run build
Set-Location ../..

# Desplegar Cloud Functions
Write-Host "🚀 Desplegando Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions

Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 No olvides:" -ForegroundColor Cyan
Write-Host "   1. Copiar las URLs de las funciones a tu .env"
Write-Host "   2. Verificar que Firestore esté habilitado en Firebase Console"
Write-Host "   3. Habilitar las APIs necesarias en Google Cloud Console"

