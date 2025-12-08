# Script PowerShell para desplegar solo analyzeFile
# Este script modifica temporalmente firebase.json para desplegar solo analyze-file

Write-Host "🚀 Iniciando despliegue de analyzeFile..." -ForegroundColor Cyan

# 1. Hacer backup de firebase.json
Write-Host "📋 Creando backup de firebase.json..." -ForegroundColor Yellow
Copy-Item firebase.json firebase.json.backup-deploy -Force

# 2. Crear firebase.json temporal solo con analyze-file
Write-Host "📝 Creando firebase.json temporal..." -ForegroundColor Yellow
$tempConfig = @{
    firestore = @{
        rules = "firestore.rules"
        indexes = "firestore/indexes.json"
    }
    functions = @(
        @{
            source = "functions/analyzeFile"
            codebase = "analyze-file"
            runtime = "nodejs20"
            environmentVariables = @{
                GOOGLE_CLIENT_ID = "468517556859-qtbplkfnqqc6ru8ga7o3d1npo76t1b62.apps.googleusercontent.com"
                GOOGLE_CLIENT_SECRET = "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"
            }
        }
    )
}

$tempConfig | ConvertTo-Json -Depth 10 | Set-Content firebase.json.temp

# 3. Compilar código TypeScript
Write-Host "🔨 Compilando código TypeScript..." -ForegroundColor Yellow
Set-Location functions/analyzeFile
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error compilando código TypeScript" -ForegroundColor Red
    Set-Location ../..
    Copy-Item firebase.json.backup-deploy firebase.json -Force
    exit 1
}
Set-Location ../..

# 4. Reemplazar firebase.json temporal
Write-Host "🔄 Reemplazando firebase.json..." -ForegroundColor Yellow
Copy-Item firebase.json.temp firebase.json -Force

# 5. Desplegar
Write-Host "☁️ Desplegando analyzeFile a Cloud Run..." -ForegroundColor Yellow
firebase deploy --only functions --force

$deployExitCode = $LASTEXITCODE

# 6. Restaurar firebase.json original
Write-Host "🔄 Restaurando firebase.json original..." -ForegroundColor Yellow
Copy-Item firebase.json.backup-deploy firebase.json -Force
Remove-Item firebase.json.temp -ErrorAction SilentlyContinue

# 7. Verificar resultado
if ($deployExitCode -eq 0) {
    Write-Host "✅ Despliegue completado exitosamente!" -ForegroundColor Green
    Write-Host "🔗 URL: https://analyzefile-mcc5aevj6a-uc.a.run.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ Error durante el despliegue" -ForegroundColor Red
    exit $deployExitCode
}

