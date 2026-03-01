# Comandos Rápidos: Configurar Procesamiento de Jobs

## 🚀 Configuración Rápida (Windows PowerShell)

### 1. Verificar si existe Cloud Scheduler

```powershell
gcloud scheduler jobs list --location=us-central1
```

### 2. Crear Cloud Scheduler (si no existe)

```powershell
gcloud scheduler jobs create http rag-worker-scheduler `
  --location=us-central1 `
  --schedule="*/2 * * * *" `
  --uri="https://us-central1-eduspark-py.cloudfunctions.net/rag-worker" `
  --http-method=POST `
  --headers="Content-Type=application/json" `
  --message-body='{"action":"processPendingJobs"}' `
  --time-zone="America/Montevideo" `
  --attempt-deadline=540s `
  --max-retry-attempts=3 `
  --min-backoff-duration=10s `
  --max-backoff-duration=300s
```

### 3. Verificar Logs de createFileProcessingJob

```powershell
# Ver últimos 50 logs
gcloud functions logs read createFileProcessingJob --limit=50

# Buscar errores relacionados con RAG worker
gcloud functions logs read createFileProcessingJob --limit=100 | Select-String -Pattern "rag worker|RAG worker|error|failed|❌"
```

### 4. Verificar Logs del RAG Worker

```powershell
gcloud functions logs read rag-worker --limit=50
```

### 5. Probar Invocación Manual del RAG Worker

```powershell
# Procesar jobs pendientes
curl.exe -X POST https://us-central1-eduspark-py.cloudfunctions.net/rag-worker `
  -H "Content-Type: application/json" `
  -d '{\"action\":\"processPendingJobs\"}'
```

### 6. Verificar Jobs Pendientes en Supabase

Ejecuta esta query en el SQL Editor de Supabase:

```sql
SELECT 
  id, 
  status, 
  created_at, 
  updated_at, 
  file_name,
  metadata->>'sourceFileId' as file_id
FROM file_processing_jobs
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📋 Checklist de Verificación

- [ ] Cloud Scheduler creado y habilitado
- [ ] Logs de createFileProcessingJob muestran intentos de invocación
- [ ] Logs del rag-worker muestran procesamiento de jobs
- [ ] Invocación manual del rag-worker funciona
- [ ] Jobs pendientes se procesan automáticamente cada 2 minutos

---

## 🔧 Solución de Problemas

### Si el scheduler no ejecuta:

```powershell
# Habilitar scheduler
gcloud scheduler jobs resume rag-worker-scheduler --location=us-central1

# Ver estado
gcloud scheduler jobs describe rag-worker-scheduler --location=us-central1
```

### Si el rag-worker no responde:

```powershell
# Verificar que esté desplegado
gcloud functions describe rag-worker --region=us-central1

# Ver logs de errores
gcloud functions logs read rag-worker --limit=100 | Select-String -Pattern "error|failed|❌"
```

---

## 📚 Documentación Completa

Para más detalles, consulta:
- `AI_CONTEXT/GUIA_VERIFICACION_Y_CONFIGURACION_PROCESAMIENTO.md`
- `AI_CONTEXT/DIAGNOSTICO_JOBS_PENDIENTES_NO_PROCESAN.md`

