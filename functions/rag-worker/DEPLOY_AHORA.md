# 🚀 Deploy del RAG Worker a Google Cloud

## Comando para Deploy

Desde la carpeta `functions/rag-worker/`, ejecuta:

```powershell
gcloud functions deploy rag-worker `
  --gen2 `
  --runtime=nodejs20 `
  --region=us-central1 `
  --source=. `
  --entry-point=processRagJobs `
  --trigger-http `
  --allow-unauthenticated `
  --timeout=3600s `
  --memory=4GB `
  --max-instances=10 `
  --project=eduspark-py `
  --set-env-vars="SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co,SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8,GEMINI_API_KEY=TU_GEMINI_API_KEY_AQUI"
```

**⚠️ IMPORTANTE:** Reemplaza `TU_GEMINI_API_KEY_AQUI` con tu clave real de Gemini API.

## Alternativa: Configurar variable de entorno

```powershell
$env:GEMINI_API_KEY = "tu-api-key-aqui"
.\deploy.ps1
```

## Verificar deploy

Después del deploy, verifica los logs:

```powershell
gcloud functions logs read rag-worker --limit=20 --region=us-central1
```

## Cambios incluidos en este deploy

✅ Lógica para resumir procesamiento desde chunks ya procesados
✅ Verificación de chunks existentes antes de procesar
✅ Continuación automática desde el último chunk procesado
✅ Mejor manejo de errores y timeouts

