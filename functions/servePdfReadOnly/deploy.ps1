# Desplegar Cloud Function para servir PDFs con restricciones

cd functions/servePdfReadOnly

# Instalar dependencias
npm install

# Configurar variables de entorno (reemplazar con tus valores reales)
$env:SUPABASE_URL="https://mckfscukxcqwntpjagar.supabase.co"
$env:SUPABASE_SERVICE_KEY="TU_SUPABASE_SERVICE_KEY_AQUI"

# Desplegar a Google Cloud Functions
gcloud functions deploy servePdfReadOnly `
  --gen2 `
  --runtime=nodejs18 `
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

