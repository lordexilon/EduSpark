# RAG Worker - Sistema de Procesamiento On-Demand

## 🎯 Arquitectura Final

```
Usuario solicita RAG
        ↓
Frontend crea job en Supabase
        ↓
Frontend llama a Cloud Function (trigger inmediato)
        ↓
Cloud Function procesa job
        ↓
Actualiza estado en Supabase
```

---

## ✅ **Componentes Desplegados:**

### **1. Cloud Function `rag-worker`**
- **URL:** `https://rag-worker-mcc5aevj6a-uc.a.run.app`
- **Región:** `us-central1`
- **Memoria:** 2GB
- **Timeout:** 540s (9 minutos)
- **Runtime:** Node.js 20
- **Trigger:** HTTP (on-demand)

### **2. Variables de Entorno Configuradas:**
- `SUPABASE_URL`: https://mckfscukxcqwntpjagar.supabase.co
- `SUPABASE_SERVICE_KEY`: ✅ Configurada
- `GEMINI_API_KEY`: ✅ Configurada

### **3. Frontend Integración:**
- Archivo: `src/services/teacherCourses.ts`
- Función: `processMaterialForRAG()`
- Trigger: Automático al crear job

---

## 🚀 Flujo de Procesamiento

### **Paso 1: Usuario Solicita RAG**
```typescript
// En MaterialsManagementPage.tsx
materialService.processMaterialForRAG(materialId, courseId)
```

### **Paso 2: Frontend Crea Job**
```sql
INSERT INTO file_processing_jobs (
  material_id,
  course_id,
  user_id,
  status,
  metadata
) VALUES (...)
```

### **Paso 3: Frontend Trigger Cloud Function**
```typescript
await fetch('https://rag-worker-mcc5aevj6a-uc.a.run.app', {
  method: 'POST'
})
```

### **Paso 4: Cloud Function Procesa**
```javascript
// 1. Obtiene job pendiente de Supabase
// 2. Descarga PDF (Google Drive o Storage)
// 3. Extrae texto con pdf-parse
// 4. Divide en chunks (30k caracteres)
// 5. Genera embeddings con Gemini
// 6. Guarda en rag_file_chunks
// 7. Marca job como completado
```

---

## 💰 Costos

### **Modelo On-Demand:**
- **Cloud Functions invocaciones:** Primeras 2M gratis/mes
- **Cloud Functions GB-seg:** Primeros 400k GB-seg gratis
- **Cloud Functions GB-seg costo:** $0.0000025 después del free tier
- **Gemini API embeddings:** $0.00001 por 1000 embeddings

### **Estimado Mensual (100 archivos/mes):**
- Cloud Functions: **$0** (dentro del free tier)
- Gemini API (100 archivos × 50 chunks avg): **$0.05**
- **TOTAL:** ~$0.05/mes

### **VS Scheduler (polling cada 30s):**
- Cloud Functions invocations vacías: ~86,400/mes
- Costo scheduler: $0.009/mes
- Costo functions: $5-10/mes
- **TOTAL:** ~$10/mes

**AHORRO: $10/mes** ✅

---

## 📊 Monitoreo

### **Ver Logs de la Función:**
```powershell
gcloud functions logs read rag-worker --region=us-central1 --project=eduspark-py --limit=50
```

### **Ver Jobs en Supabase:**
```sql
SELECT id, status, file_name, created_at, error_message
FROM file_processing_jobs
ORDER BY created_at DESC
LIMIT 10;
```

### **Ver Chunks Procesados:**
```sql
SELECT material_id, COUNT(*) as chunks, MAX(chunk_number) as total_chunks
FROM rag_file_chunks
GROUP BY material_id
ORDER BY MAX(created_at) DESC;
```

---

## 🔧 Troubleshooting

### **Función no responde:**
```powershell
# Verificar estado
gcloud functions describe rag-worker --region=us-central1 --project=eduspark-py

# Ver logs recientes
gcloud functions logs read rag-worker --region=us-central1 --limit=20
```

### **Job atascado en "processing":**
```sql
-- Resetear job
UPDATE file_processing_jobs
SET status = 'pending', updated_at = NOW()
WHERE id = '<job_id>' AND status = 'processing';

-- Luego trigger manualmente
-- Desde PowerShell:
Invoke-WebRequest -Uri https://rag-worker-mcc5aevj6a-uc.a.run.app -Method POST
```

### **Error de Google Drive token:**
1. Usuario debe reconectar Google Drive en `/profile`
2. Verificar que el token no haya expirado:
```sql
SELECT user_id, expires_at, service_type
FROM user_google_tokens
WHERE user_id = '<user_id>';
```

---

## 🔄 Actualizaciones Futuras

### **Para actualizar la función:**
```powershell
cd functions/rag-worker

# Editar index.js con los cambios

# Redeploy
gcloud functions deploy rag-worker `
  --runtime=nodejs20 `
  --region=us-central1 `
  --source=. `
  --entry-point=processRagJobs `
  --trigger-http `
  --allow-unauthenticated `
  --timeout=540s `
  --memory=2048MB `
  --max-instances=10 `
  --project=eduspark-py `
  --set-env-vars="SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co,SUPABASE_SERVICE_KEY=<KEY>,GEMINI_API_KEY=<KEY>"
```

---

## 📝 Notas Importantes

1. **La función es stateless:** No mantiene estado entre llamadas
2. **Procesa 1 job por ejecución:** Para evitar timeouts
3. **Manejo de errores:** Si falla, marca el job como 'failed' en Supabase
4. **Rate limiting:** Max 10 instancias concurrentes
5. **CORS:** Permite todas las origins (`--allow-unauthenticated`)

---

## ✅ Checklist de Deployment

- [x] Cloud Function desplegada
- [x] Variables de entorno configuradas
- [x] Frontend integrado (trigger on-demand)
- [x] Tested con job real
- [ ] Cloud Scheduler eliminado (no necesario)
- [x] Documentación completa
- [x] Costos optimizados

---

## 🎉 Estado Final

**Sistema 100% Operativo - On-Demand - Costo Optimizado**
