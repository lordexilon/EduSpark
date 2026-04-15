# Edge Function: Procesar Retroalimentación del Tutor

Esta función procesa automáticamente las respuestas de conocimiento general del tutor y las convierte en chunks RAG.

## 📋 Descripción

Procesa respuestas pendientes de `tutor_general_knowledge_responses` y las convierte en chunks RAG en `course_content_chunks`.

## 🚀 Uso

### Ejecución Manual (HTTP)

```bash
# Procesar todas las respuestas pendientes
curl -X POST https://<project-ref>.supabase.co/functions/v1/process-feedback \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json"

# Procesar solo un curso específico
curl -X POST "https://<project-ref>.supabase.co/functions/v1/process-feedback?course_id=12" \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json"

# Con límite personalizado
curl -X POST "https://<project-ref>.supabase.co/functions/v1/process-feedback?limit=20" \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json"
```

### Ejecución Automática

#### Opción 1: Google Cloud Scheduler (Recomendado)

1. Crear tarea en Google Cloud Scheduler
2. URL: `https://<project-ref>.supabase.co/functions/v1/process-feedback`
3. Método: POST
4. Headers: `Authorization: Bearer <anon-key>`
5. Frecuencia: Ej. `0 2 * * *` (diario a las 2 AM)

#### Opción 2: Supabase Cron (Requiere Pro Plan)

Si tienes Supabase Pro, puedes configurar cron jobs directamente:

```toml
# En supabase/config.toml
[cron]
  [cron.process-feedback]
    schedule = "0 2 * * *"  # Diario a las 2 AM
    function = "process-feedback"
```

## ⚙️ Variables de Entorno

Configurar en Supabase Dashboard → Edge Functions → Settings:

- `SUPABASE_URL`: URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (para bypass RLS)
- `GEMINI_API_KEY`: API key de Gemini para embeddings

## 📊 Respuesta

```json
{
  "success": true,
  "processed": 5,
  "chunksCreated": 8,
  "errors": 0,
  "message": "Procesadas 5 respuestas, creados 8 chunks"
}
```

## 🔧 Parámetros

- `course_id` (opcional): ID del curso para filtrar respuestas
- `limit` (opcional): Límite de respuestas a procesar (default: 50)
