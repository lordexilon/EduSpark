# Instrucciones de Despliegue del RAG Worker

## ✅ Estado Actual

- ✅ **Cloud Scheduler creado**: `rag-worker-scheduler` (ejecuta cada 2 minutos)
- ✅ **Código corregido**: rag-worker ahora busca `materialId` correctamente
- ⏳ **Despliegue en curso**: El rag-worker se está desplegando

## 🔍 Verificar Estado del Despliegue

### Opción 1: Verificar en Google Cloud Console

1. Ve a [Cloud Functions](https://console.cloud.google.com/functions/list?project=eduspark-py)
2. Busca la función `rag-worker`
3. Verifica que el estado sea "Active" y la última actualización sea reciente

### Opción 2: Usando gcloud CLI

```powershell
# Verificar estado de la función
gcloud functions describe rag-worker --region=us-central1 --gen2

# Ver logs del despliegue
gcloud functions logs read rag-worker --region=us-central1 --limit=10
```

## 📋 Comando de Despliegue Manual (si es necesario)

Si el despliegue automático no funcionó, ejecuta manualmente:

```powershell
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
  --project=eduspark-py `
  --set-env-vars="SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co,SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8"
```

**Nota**: Necesitarás agregar `GEMINI_API_KEY` si no está configurada. Puedes obtenerla de las variables de entorno existentes:

```powershell
# Ver variables de entorno actuales
gcloud functions describe rag-worker --region=us-central1 --gen2 --format="value(serviceConfig.environmentVariables)"
```

## ✅ Verificación Post-Despliegue

### 1. Verificar que la función esté activa

```powershell
gcloud functions describe rag-worker --region=us-central1 --gen2 --format="value(state)"
```

Debería mostrar: `ACTIVE`

### 2. Probar invocación manual

```powershell
Invoke-WebRequest -Uri "https://us-central1-eduspark-py.cloudfunctions.net/rag-worker" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"action":"processPendingJobs"}' `
  -ErrorAction SilentlyContinue | Select-Object StatusCode, Content
```

### 3. Verificar logs

```powershell
# Ver logs recientes
gcloud functions logs read rag-worker --region=us-central1 --limit=20

# Buscar logs relacionados con materialId
gcloud functions logs read rag-worker --region=us-central1 --limit=50 | Select-String -Pattern "materialId|Material|✅|❌"
```

### 4. Verificar que los jobs se procesen

Espera 2-3 minutos después del despliegue y verifica:

```sql
-- En Supabase SQL Editor
SELECT id, status, created_at, updated_at, file_name
FROM file_processing_jobs
WHERE status IN ('processing', 'completed')
ORDER BY updated_at DESC
LIMIT 10;
```

## 🎯 Resultado Esperado

Después del despliegue exitoso:

1. ✅ Los jobs pendientes deberían cambiar de `pending` a `processing`
2. ✅ Los logs del rag-worker mostrarán: `✅ MaterialId agregado a metadata desde campo superior`
3. ✅ El procesamiento debería continuar normalmente
4. ✅ El Cloud Scheduler procesará jobs pendientes cada 2 minutos automáticamente

## 🐛 Si Hay Problemas

1. **Verificar variables de entorno**: Asegúrate de que `GEMINI_API_KEY` esté configurada
2. **Revisar logs**: Los logs mejorados mostrarán exactamente qué está fallando
3. **Verificar permisos**: Asegúrate de tener permisos para desplegar Cloud Functions
4. **Probar invocación manual**: Esto ayudará a identificar si el problema es con el scheduler o con la función

## 📞 Soporte

Si después de seguir estos pasos los jobs aún no se procesan:

1. Revisa `AI_CONTEXT/SOLUCION_MATERIALID_RAG_WORKER.md` para detalles técnicos
2. Revisa `AI_CONTEXT/DIAGNOSTICO_JOBS_PENDIENTES_NO_PROCESAN.md` para diagnóstico completo
3. Verifica los logs mejorados de `createFileProcessingJob` y `rag-worker`

