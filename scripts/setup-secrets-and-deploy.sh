# Script para configurar secretos y deployar RAG Worker
# Este script debe ejecutarse UNA VEZ manualmente

# PASO 1: Crear secretos en Google Secret Manager
# Reemplaza los valores con los de tu .env local

echo "Creando secretos en Google Secret Manager..."

# IMPORTANTE: Ejecuta estos comandos uno por uno, reemplazando <TU_VALOR> con el valor real de tu .env

# Supabase URL
echo -n "https://mckfscukxcqwntpjagar.supabase.co" | gcloud secrets create SUPABASE_URL --data-file=- --project=eduspark-py

# Supabase Service Key (usa el valor de VITE_SUPABASE_SERVICE_ROLE_KEY de tu .env)
echo -n "<TU_SUPABASE_SERVICE_KEY>" | gcloud secrets create SUPABASE_SERVICE_KEY --data-file=- --project=eduspark-py

# Google Client ID
echo -n "<TU_GOOGLE_CLIENT_ID>" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=- --project=eduspark-py

# Google Client Secret  
echo -n "<TU_GOOGLE_CLIENT_SECRET>" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- --project=eduspark-py

# Gemini API Key
echo -n "<TU_VITE_GEMINI_API_KEY>" | gcloud secrets create GEMINI_API_KEY --data-file=- --project=eduspark-py

echo "Secretos creados exitosamente!"

# PASO 2: Deploy con secretos
gcloud run deploy rag-processing-worker \
  --image gcr.io/eduspark-py/rag-processing-worker \
  --platform managed \
  --region us-central1 \
  --project eduspark-py \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 10 \
  --min-instances 1 \
  --set-secrets="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,VITE_GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production,WORKER_INTERVAL_MS=30000" \
  --allow-unauthenticated

echo "Deployment completado!"
