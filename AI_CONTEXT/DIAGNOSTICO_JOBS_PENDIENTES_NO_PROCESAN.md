# Diagnóstico: Jobs Quedan en Estado "Pending" y No Se Procesan

## Problema Identificado

Los jobs se crean exitosamente pero permanecen en estado `pending` y nunca cambian a `processing` o `completed`.

### Síntomas Observados

1. ✅ Job se crea exitosamente: `✅ Job creado exitosamente: 51ba4c46-52a1-45db-8846-713f825f0a87`
2. ❌ Job permanece en estado `pending` indefinidamente
3. ❌ `startedAt` permanece como `undefined`
4. ⚠️ Mensaje: `[ProcessingStage] ✅ Job en pending, retornando mensaje de cola`

## Flujo Esperado

1. **Frontend** → Llama a `createFileProcessingJob`
2. **createFileProcessingJob** → Crea job en Supabase con estado `pending`
3. **createFileProcessingJob** → Intenta invocar `rag-worker` inmediatamente
4. **rag-worker** → Procesa el job y cambia estado a `processing`
5. Si falla la invocación → Cloud Scheduler procesa jobs pendientes cada 2 minutos

## Posibles Causas

### 1. RAG Worker No Responde Correctamente

**Síntoma:** La invocación desde `createFileProcessingJob` falla silenciosamente.

**Verificación:**
- Revisar logs de `createFileProcessingJob` en Google Cloud Console
- Buscar errores de conexión o timeout
- Verificar que la URL del rag-worker sea correcta

**Solución:**
- Verificar que `rag-worker` esté desplegado y accesible
- Verificar la variable de entorno `RAG_WORKER_URL`
- Revisar logs del rag-worker para ver si recibe las peticiones

### 2. Cloud Scheduler No Está Configurado

**Síntoma:** Los jobs nunca se procesan automáticamente.

**Verificación:**
```bash
# Verificar si existe un Cloud Scheduler
gcloud scheduler jobs list --location=us-central1

# Verificar logs del scheduler
gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1
```

**Solución:**
Si no existe, crear un Cloud Scheduler que invoque al rag-worker cada 2 minutos:

```bash
gcloud scheduler jobs create http rag-worker-scheduler \
  --location=us-central1 \
  --schedule="*/2 * * * *" \
  --uri="https://us-central1-eduspark-py.cloudfunctions.net/rag-worker" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"action":"processPendingJobs"}' \
  --time-zone="America/Montevideo"
```

### 3. Error en la Invocación del RAG Worker

**Síntoma:** El rag-worker recibe la petición pero falla al procesar.

**Verificación:**
- Revisar logs del rag-worker en Google Cloud Console
- Verificar que el rag-worker pueda acceder a Supabase
- Verificar que el rag-worker tenga los permisos necesarios

**Solución:**
- Revisar logs detallados del rag-worker
- Verificar configuración de Supabase en el rag-worker
- Verificar que el job tenga todos los campos requeridos

## Mejoras Implementadas

### 1. Logging Mejorado en `createFileProcessingJob`

Se ha mejorado el logging para incluir:
- URL del rag-worker utilizada
- Detalles completos de la respuesta HTTP
- Stack traces completos de errores
- Información de configuración

### 2. Verificación de Configuración

El código ahora loggea:
- Si la URL viene de variable de entorno o es el default
- La URL completa que se está usando
- El cuerpo de la petición enviada

## Pasos para Diagnosticar

### Paso 1: Verificar Logs de createFileProcessingJob

```bash
# Ver logs recientes
gcloud functions logs read createFileProcessingJob --limit 50

# Buscar intentos de invocación del rag-worker
gcloud functions logs read createFileProcessingJob --limit 100 | grep "RAG worker"
```

**Buscar:**
- `🔄 Intento X/3 de invocar RAG worker`
- `✅ RAG worker invocado exitosamente`
- `❌ Error en intento`
- `❌ No se pudo invocar RAG worker`

### Paso 2: Verificar Logs del RAG Worker

```bash
# Ver logs del rag-worker
gcloud functions logs read rag-worker --limit 50

# Buscar procesamiento de jobs
gcloud functions logs read rag-worker --limit 100 | grep "job"
```

**Buscar:**
- `Procesando job: [job-id]`
- `Job marcado como processing`
- Errores de procesamiento

### Paso 3: Verificar Estado del Job en Supabase

```sql
-- Ver jobs pendientes
SELECT id, status, created_at, updated_at, metadata->>'sourceFileId' as file_id
FROM file_processing_jobs
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- Ver detalles de un job específico
SELECT *
FROM file_processing_jobs
WHERE id = '51ba4c46-52a1-45db-8846-713f825f0a87';
```

### Paso 4: Invocar RAG Worker Manualmente

```bash
# Invocar rag-worker directamente para procesar jobs pendientes
curl -X POST https://us-central1-eduspark-py.cloudfunctions.net/rag-worker \
  -H "Content-Type: application/json" \
  -d '{"action":"processPendingJobs"}'

# O invocar para un job específico
curl -X POST https://us-central1-eduspark-py.cloudfunctions.net/rag-worker \
  -H "Content-Type: application/json" \
  -d '{"jobId":"51ba4c46-52a1-45db-8846-713f825f0a87","action":"process"}'
```

## Soluciones Recomendadas

### Solución 1: Verificar y Corregir URL del RAG Worker

1. Verificar que la URL sea correcta en `createFileProcessingJob`
2. Verificar que el rag-worker esté desplegado y accesible
3. Probar la URL manualmente con curl

### Solución 2: Configurar Cloud Scheduler

Si no existe un scheduler, crear uno que procese jobs pendientes cada 2 minutos.

### Solución 3: Mejorar Manejo de Errores

Asegurar que los errores se loggeen correctamente y no se silencien.

### Solución 4: Verificar Permisos

Asegurar que el rag-worker tenga permisos para:
- Leer jobs de Supabase
- Actualizar estado de jobs
- Acceder a Google Drive (si aplica)
- Escribir en Supabase Storage

## Próximos Pasos

1. ✅ Mejorar logging en `createFileProcessingJob` (COMPLETADO)
2. ⏳ Revisar logs de `createFileProcessingJob` para ver errores específicos
3. ⏳ Verificar que el rag-worker esté funcionando correctamente
4. ⏳ Configurar Cloud Scheduler si no existe
5. ⏳ Probar invocación manual del rag-worker

## Notas Adicionales

- El código actual tiene retry con exponential backoff (3 intentos)
- Si todos los intentos fallan, el job queda en cola para el scheduler
- El scheduler debería procesar jobs pendientes automáticamente
- Si el scheduler no está configurado, los jobs nunca se procesarán automáticamente

