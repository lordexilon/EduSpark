# Guía: Verificación y Configuración del Sistema de Procesamiento

## Problema

Los jobs quedan en estado `pending` y no se procesan automáticamente.

## Solución: Configurar Cloud Scheduler

El sistema necesita un Cloud Scheduler que procese jobs pendientes cada 2 minutos como respaldo cuando la invocación inmediata desde `createFileProcessingJob` falla.

---

## Paso 1: Verificar si Existe Cloud Scheduler

### Opción A: Usando gcloud CLI

```bash
gcloud scheduler jobs list --location=us-central1
```

Busca un job llamado `rag-worker-scheduler`.

### Opción B: Usando Google Cloud Console

1. Ve a [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)
2. Selecciona el proyecto `eduspark-py`
3. Busca un job llamado `rag-worker-scheduler`

---

## Paso 2: Crear Cloud Scheduler (si no existe)

### Comando Completo

```bash
gcloud scheduler jobs create http rag-worker-scheduler \
  --location=us-central1 \
  --schedule="*/2 * * * *" \
  --uri="https://us-central1-eduspark-py.cloudfunctions.net/rag-worker" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"action":"processPendingJobs"}' \
  --time-zone="America/Montevideo" \
  --attempt-deadline=540s \
  --max-retry-attempts=3 \
  --min-backoff-duration=10s \
  --max-backoff-duration=300s
```

### Explicación de Parámetros

- `--schedule="*/2 * * * *"`: Ejecuta cada 2 minutos
- `--uri`: URL del rag-worker
- `--message-body`: Acción a ejecutar (`processPendingJobs`)
- `--attempt-deadline=540s`: Timeout de 9 minutos (mismo que la función)
- `--max-retry-attempts=3`: Reintentos automáticos
- `--time-zone="America/Montevideo"`: Zona horaria de Uruguay

---

## Paso 3: Verificar Logs Mejorados

### Ver Logs de createFileProcessingJob

```bash
# Ver últimos 50 logs
gcloud functions logs read createFileProcessingJob --limit=50

# Filtrar solo logs relacionados con RAG worker
gcloud functions logs read createFileProcessingJob --limit=100 | grep -i "rag worker"

# Ver logs en tiempo real (requiere otra terminal)
gcloud functions logs tail createFileProcessingJob
```

### Buscar Errores Específicos

```bash
# Buscar errores de invocación
gcloud functions logs read createFileProcessingJob --limit=100 | grep -i "error\|failed\|❌"

# Buscar intentos exitosos
gcloud functions logs read createFileProcessingJob --limit=100 | grep -i "✅.*rag worker"
```

---

## Paso 4: Verificar Logs del RAG Worker

```bash
# Ver últimos 50 logs
gcloud functions logs read rag-worker --limit=50

# Buscar procesamiento de jobs
gcloud functions logs read rag-worker --limit=100 | grep -i "job\|processing\|pending"

# Ver logs en tiempo real
gcloud functions logs tail rag-worker
```

---

## Paso 5: Probar Invocación Manual

### Probar Procesamiento de Jobs Pendientes

```bash
curl -X POST https://us-central1-eduspark-py.cloudfunctions.net/rag-worker \
  -H "Content-Type: application/json" \
  -d '{"action":"processPendingJobs"}' \
  -v
```

### Probar Job Específico

```bash
curl -X POST https://us-central1-eduspark-py.cloudfunctions.net/rag-worker \
  -H "Content-Type: application/json" \
  -d '{"jobId":"TU_JOB_ID_AQUI","action":"process"}' \
  -v
```

---

## Paso 6: Verificar Jobs Pendientes en Supabase

### Query SQL

```sql
-- Ver jobs pendientes
SELECT 
  id, 
  status, 
  created_at, 
  updated_at, 
  file_name,
  metadata->>'sourceFileId' as file_id,
  metadata->>'chunksTotal' as chunks_total,
  metadata->>'chunksProcessed' as chunks_processed
FROM file_processing_jobs
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- Ver detalles de un job específico
SELECT *
FROM file_processing_jobs
WHERE id = 'TU_JOB_ID_AQUI';

-- Contar jobs por estado
SELECT status, COUNT(*) as count
FROM file_processing_jobs
GROUP BY status;
```

---

## Paso 7: Usar Scripts de Verificación

### Linux/Mac

```bash
chmod +x scripts/verificar_y_configurar_procesamiento.sh
./scripts/verificar_y_configurar_procesamiento.sh
```

### Windows PowerShell

```powershell
.\scripts\configurar_scheduler.ps1
```

---

## Diagnóstico de Problemas Comunes

### Problema 1: Scheduler No Ejecuta

**Síntoma:** El scheduler existe pero no procesa jobs.

**Solución:**
1. Verificar que el scheduler esté habilitado:
   ```bash
   gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1
   ```

2. Habilitar si está deshabilitado:
   ```bash
   gcloud scheduler jobs resume rag-worker-scheduler --location=us-central1
   ```

3. Verificar logs del scheduler:
   ```bash
   gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1 --format="value(state)"
   ```

### Problema 2: RAG Worker No Responde

**Síntoma:** El scheduler ejecuta pero el rag-worker no responde.

**Solución:**
1. Verificar que el rag-worker esté desplegado:
   ```bash
   gcloud functions describe rag-worker --region=us-central1
   ```

2. Verificar logs del rag-worker para errores
3. Probar invocación manual (ver Paso 5)

### Problema 3: Jobs Se Crean Pero No Se Procesan

**Síntoma:** Los jobs se crean exitosamente pero permanecen en `pending`.

**Solución:**
1. Verificar logs de `createFileProcessingJob` para ver si la invocación al rag-worker falla
2. Verificar que el Cloud Scheduler esté configurado y funcionando
3. Probar invocación manual del rag-worker
4. Verificar que los jobs tengan todos los campos requeridos

---

## Verificación Post-Configuración

Después de configurar el scheduler, espera 2-3 minutos y verifica:

1. **Verificar que el scheduler ejecutó:**
   ```bash
   gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1
   ```

2. **Verificar logs del rag-worker:**
   ```bash
   gcloud functions logs read rag-worker --limit=20
   ```

3. **Verificar que los jobs cambiaron de estado:**
   ```sql
   SELECT id, status, updated_at 
   FROM file_processing_jobs 
   WHERE status IN ('processing', 'completed')
   ORDER BY updated_at DESC 
   LIMIT 10;
   ```

---

## Monitoreo Continuo

### Comandos Útiles

```bash
# Ver estado del scheduler
gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1

# Ver última ejecución del scheduler
gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1 --format="value(lastAttemptTime)"

# Ver jobs pendientes (query SQL en Supabase)
SELECT COUNT(*) FROM file_processing_jobs WHERE status = 'pending';

# Ver logs recientes de ambas funciones
gcloud functions logs read createFileProcessingJob --limit=10
gcloud functions logs read rag-worker --limit=10
```

---

## Notas Importantes

1. **El scheduler es un respaldo**: La invocación inmediata desde `createFileProcessingJob` debería funcionar primero
2. **Tiempo de procesamiento**: Los jobs grandes pueden tardar varios minutos en procesarse
3. **Reintentos**: El scheduler tiene 3 reintentos automáticos con exponential backoff
4. **Timeout**: El scheduler tiene un timeout de 540 segundos (9 minutos)

---

## Soporte

Si después de seguir estos pasos los jobs aún no se procesan:

1. Revisa los logs mejorados de `createFileProcessingJob`
2. Verifica los logs del `rag-worker`
3. Verifica que el Cloud Scheduler esté ejecutándose correctamente
4. Prueba la invocación manual del rag-worker

