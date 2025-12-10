# 📊 Estado Actual RAG Worker VM - 2025-12-09

## ✅ Estado: FUNCIONAL (con optimizaciones pendientes)

---

## 🔄 Cambios Realizados Hoy (2025-12-09)

### 1. Frontend - FileProcessingPage.tsx
- ✅ Cambiado de llamar Cloud Function `createfileprocessingjob` a llamar directamente `firestoreService.createJob`
- ✅ Los jobs ahora se crean en Supabase con status `pending` (no en Firestore viejo)
- ✅ Agregada lectura de campos `phase`, `pagesProcessed`, `totalPages` para mostrar progreso real

### 2. Worker VM - index.vm.js
- ✅ Agregado flag `isProcessing` para evitar ejecuciones concurrentes
- ✅ Agregado refresh automático de tokens de Google Drive expirados
- ✅ Agregado reporte de progreso cada 50 páginas con `phase: 'extracting'`
- ✅ Variables de entorno `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` añadidas al .env de la VM

### 3. Scripts de utilidad creados en la VM
- `fix_jobs.js` - Resetear jobs stuck a pending
- `reset_job.js` - Resetear un job específico
- `check_job.js` - Ver estado actual de un job

---

## ⚠️ Problema Conocido: Lentitud en Extracción

### Causa:
La extracción página por página es **inherentemente más lenta** que la extracción de todo el documento de una vez, pero es la **única forma** de procesar PDFs muy grandes sin crashear por memoria.

### Tiempos aproximados por tamaño de PDF:

| Tamaño PDF | Páginas | Tiempo Extracción | Tiempo Embeddings | Total |
|------------|---------|-------------------|------------------|-------|
| 10 MB | ~100 | 1-2 min | 1 min | ~3 min |
| 50 MB | ~500 | 5-10 min | 5 min | ~15 min |
| 150 MB | ~1000 | 15-20 min | 10 min | ~30 min |
| 400 MB | ~5000 | 45-60 min | 30 min | ~90 min |
| 900 MB | ~8000+ | 70-90 min | 40 min | ~2 horas |

### Comparación con Cloud Functions:

| Aspecto | Cloud Function | VM |
|---------|---------------|-----|
| Archivos < 50 MB | ✅ Rápido | ✅ Rápido |
| Archivos 50-200 MB | ⚠️ A veces falla | ✅ Funciona |
| Archivos > 200 MB | ❌ Crash "Invalid string length" | ✅ Funciona (lento pero seguro) |
| Timeout | 60 min máx | Sin límite |
| RAM | 2 GB | 8 GB |

---

## 🚀 Optimizaciones Pendientes

### 1. Paralelismo (Alta Prioridad)
Procesar 4 páginas en paralelo en lugar de 1 a la vez.
- Reducción estimada: 4x más rápido
- Tiempo Harrison: ~25 min en lugar de ~90 min

### 2. Cache de PDF (Media Prioridad)
Mantener el PDFDocument en memoria en lugar de recrearlo para cada página.
- Reducción estimada: 20% más rápido

### 3. Streaming a Supabase (Baja Prioridad)
Enviar chunks a Supabase en batches de 10 en lugar de 5.
- Reducción: Menos latencia de red

---

## 📁 Archivos Clave

### Frontend
- `src/pages/FileProcessingPage.tsx` - UI de procesamiento
- `src/services/firestoreService.ts` - Creación de jobs

### Worker VM
- `functions/rag-worker/index.vm.js` - Código principal del worker
- `functions/rag-worker/fix_jobs.js` - Utilidad para resetear jobs
- `functions/rag-worker/check_job.js` - Utilidad para verificar jobs

### VM
- Path: `/opt/rag-worker/functions/rag-worker/`
- Service: `rag-worker.service` (systemd)
- Logs: `sudo journalctl -u rag-worker -f`

---

## 🔧 Comandos Útiles

```bash
# Conectarse a la VM
gcloud compute ssh rag-worker-vm --zone=us-central1-a

# Ver logs en vivo
sudo journalctl -u rag-worker -f

# Verificar estado del proceso
ps aux | grep node

# Reiniciar worker
sudo systemctl restart rag-worker

# Ver estado de un job
cd /opt/rag-worker/functions/rag-worker && node check_job.js

# Resetear un job a pending
cd /opt/rag-worker/functions/rag-worker && node reset_job.js

# Copiar archivo local a VM
gcloud compute scp archivo.js rag-worker-vm:/opt/rag-worker/functions/rag-worker/ --zone=us-central1-a
```

---

## 📊 Monitoreo del Job Actual

El job Harrison (4987b29d...) está procesando:
- Estado: `processing`
- Total páginas: 8267
- Worker PID: 36232
- CPU: ~75%
- RAM: ~2.5 GB

---

## ✅ Flujo Actual Funcional

```
1. Usuario sube PDF en Frontend
2. Frontend analiza con Cloud Function `analyzeFile`
3. Usuario hace clic en "Procesar"
4. Frontend crea material en Supabase
5. Frontend crea job en tabla `file_processing_jobs` con status `pending`
6. Worker VM detecta job pendiente (cada 2 min)
7. Worker descarga PDF de Google Drive (con refresh de token si expira)
8. Worker extrae texto página por página
9. Worker crea chunks de ~30,000 caracteres
10. Worker genera embeddings con Gemini
11. Worker guarda chunks en `course_content_chunks`
12. Worker marca job como `completed`
```

---

**Última actualización:** 2025-12-09 12:30
