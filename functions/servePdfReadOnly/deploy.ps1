# Desplegar Cloud Function para servir PDFs con restricciones

cd functions/servePdfReadOnly

# Instalar dependencias
npm install

# Configurar variables de entorno desde .env
$envFile = "../../.env"
if (Test-Path $envFile) {
    Write-Host "Leyendo configuración desde $envFile..."
    Get-Content $envFile | Foreach-Object {
        $line = $_.Trim()
        if ($line -match '^([^#=]+)=(.*)') {
            $name = $matches[1]
            $value = $matches[2]
            if ($name -eq "VITE_SUPABASE_URL") { $env:SUPABASE_URL = $value }
            if ($name -eq "VITE_SUPABASE_SERVICE_ROLE_KEY") { $env:SUPABASE_SERVICE_KEY = $value }
        }
    }
} else {
    Write-Warning "Archivo .env no encontrado en $envFile"
}

if (-not $env:SUPABASE_URL) { $env:SUPABASE_URL="https://mckfscukxcqwntpjagar.supabase.co" }
if (-not $env:SUPABASE_SERVICE_KEY) { 
    Write-Error "SUPABASE_SERVICE_KEY no encontrado en .env. Por favor verifica tu configuración."
    exit 1
}

# Desplegar a Google Cloud Functions
gcloud functions deploy servePdfReadOnly `
  --gen2 `
  --runtime=nodejs20 `
  --region=us-central1 `
  --source=. `
  --entry-point=servePdfReadOnly `
  --trigger-http `
  --allow-unauthenticated `
  --timeout=540s `
  --memory=512MB `
  --set-env-vars "SUPABASE_URL=$env:SUPABASE_URL,SUPABASE_SERVICE_KEY=$env:SUPABASE_SERVICE_KEY"

# Obtener la URL de la función
gcloud functions describe servePdfReadOnly --region=us-central1 --gen2 --format="value(serviceConfig.uri)"

