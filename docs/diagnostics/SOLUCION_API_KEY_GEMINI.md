# Solución: Configurar API Key de Google Gemini

## Problema

El `rag-worker` está fallando al generar embeddings porque el API key de Google Gemini no es válido:

```
[GoogleGenerativeAI Error]: API key not valid. Please pass a valid API key.
Reason: API_KEY_INVALID
```

**Resultado**: 273/273 chunks fallidos para Williams Obstetricia

## Causa

La variable de entorno `GEMINI_API_KEY` en el `rag-worker` está:
- No configurada
- Expirada
- Revocada
- O incorrecta

## Solución

### Opción 1: Obtener un nuevo API key de Google Gemini (GRATIS)

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Get API Key" o "Create API Key"
4. Copia el API key generado

### Opción 2: Desplegar el rag-worker con el API key

Una vez tengas el API key, despliega el `rag-worker` con la variable de entorno configurada:

```powershell
# Reemplaza YOUR_GEMINI_API_KEY con tu API key real
$env:GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"

cd functions/rag-worker

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
  --set-env-vars="SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co,SUPABASE_SERVICE_KEY=<TU_SUPABASE_SERVICE_KEY>,GEMINI_API_KEY=$env:GEMINI_API_KEY" `
  --project=eduspark-py
```

### Opción 3: Actualizar solo las variables de entorno (más rápido)

Si ya está desplegado, solo actualiza las variables de entorno:

```powershell
gcloud functions deploy rag-worker `
  --gen2 `
  --region=us-central1 `
  --update-env-vars="GEMINI_API_KEY=YOUR_GEMINI_API_KEY" `
  --project=eduspark-py
```

## Verificación

Después de desplegar con el API key correcto:

1. El scheduler procesará automáticamente el job en los próximos 2 minutos
2. O puedes forzar la ejecución manual:

```powershell
gcloud scheduler jobs run rag-worker-scheduler --location=us-central1
```

3. Verifica los logs:

```powershell
gcloud functions logs read rag-worker --region=us-central1 --limit=20
```

Deberías ver:
```
[RAG Worker] Procesando job...
[RAG Worker] Chunks procesados: 273/273 (0 fallidos)
✅ Job completado exitosamente
```

## Notas importantes

- **Google Gemini es GRATIS** hasta 15 requests por minuto
- El modelo `text-embedding-004` genera embeddings de 768 dimensiones
- Es más barato y rápido que OpenAI para embeddings

## Alternativa: Usar OpenAI en lugar de Gemini

Si prefieres usar OpenAI, necesitarías:
1. Modificar el código del `rag-worker` para usar OpenAI Embeddings
2. Configurar `OPENAI_API_KEY` en lugar de `GEMINI_API_KEY`
3. Cambiar el modelo de embeddings en el código

Pero Google Gemini es la mejor opción por ser gratuito y rápido.

