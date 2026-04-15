# RAG Worker - Sistema de Procesamiento Vectorial

**Última actualización:** 2025-11-30  
**Estado:** ✅ Operativo en Google Cloud

---

## 🎯 **DESCRIPCIÓN**

Sistema de procesamiento RAG (Retrieval-Augmented Generation) que convierte PDFs de materiales educativos en chunks vectorizados para uso del Tutor Virtual IA.

---

## 📍 **UBICACIÓN Y COMPONENTES**

### **Cloud Function (Producción):**
- **Nombre:** `rag-worker`
- **URL:** `https://rag-worker-mcc5aevj6a-uc.a.run.app`
- **Región:** `us-central1`
- **Runtime:** Node.js 20
- **Memoria:** 2GB
- **Timeout:** 540s (9 minutos)
- **Trigger:** HTTP On-Demand

### **Código Fuente:**
- **Función:** `functions/rag-worker/index.js`
- **Package:** `functions/rag-worker/package.json`

### **Frontend:**
- **Servicio:** `src/services/teacherCourses.ts` → `processMaterialForRAG()`
- **UI:** `/teacher/materials` → Botón "Procesar RAG"

---

## 🔄 **FLUJO DE PROCESAMIENTO**

```
1. Usuario click "Procesar RAG" en /teacher/materials
   ↓
2. Frontend crea job en Supabase (file_processing_jobs)
   ↓
3. Frontend trigger Cloud Function (on-demand)
   ↓
4. Cloud Function:
   a. Obtiene job pendiente
   b. Descarga PDF (Google Drive o Supabase Storage)
   c. Extrae texto con pdf-parse
   d. Divide en chunks (30k caracteres)
   e. Genera embeddings con Gemini (text-embedding-004)
   f. Guarda en rag_file_chunks
   g. Actualiza job status
   ↓
5. Material queda listo para Tutor IA
```

---

## 🗄️ **TABLAS DE SUPABASE**

### **file_processing_jobs:**
```sql
- id: uuid (PK)
- material_id: uuid (FK → materials)
- course_id: bigint
- bucket_path: text (nullable - puede ser null si es Google Drive)
- file_name: text
- status: text ('pending', 'processing', 'completed', 'failed')
- error_message: text
- metadata: jsonb {
    source: 'google_drive' | 'bucket',
    driveFileId: string,
    userId: uuid,
    materialId: uuid
  }
- created_at: timestamp
- updated_at: timestamp
```

### **rag_file_chunks:**
```sql
- id: uuid (PK)
- material_id: uuid (FK → materials)
- chunk_number: integer
- content: text
- embedding: vector(768)  -- Gemini text-embedding-004
- page_start: integer
- page_end: integer
- created_at: timestamp
```

### **materials:**
```sql
- rag_status: text ('pending', 'processing', 'completed', 'failed')
- processed_at: timestamp
- metadata: jsonb {
    processingJobId: uuid  -- Para botón "Cancelar"
  }
```

---

## ⚙️ **VARIABLES DE ENTORNO (Cloud Function)**

```bash
SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
GEMINI_API_KEY=<gemini_api_key>
```

---

## 🚀 **DEPLOYMENT**

### **Comando de Deploy:**
```bash
gcloud functions deploy rag-worker \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=functions/rag-worker \
  --entry-point=processRagJobs \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=540s \
  --memory=2048MB \
  --max-instances=10 \
  --project=eduspark-py \
  --set-env-vars="SUPABASE_URL=...,SUPABASE_SERVICE_KEY=...,GEMINI_API_KEY=..."
```

### **Ver Logs:**
```bash
gcloud functions logs read rag-worker \
  --region=us-central1 \
  --project=eduspark-py \
  --limit=50
```

---

## 💰 **COSTOS**

### **Modelo On-Demand (Actual):**
- **Cloud Functions invocations:** Primeras 2M gratis/mes
- **Cloud Functions compute:** ~$0.05/mes (100 archivos)
- **Gemini embeddings:** $0.00001 por 1000 embeddings
- **TOTAL:** ~$0.05/mes

### **Ahorro vs Polling (Descartado):**
- Scheduler cada 30s: ~$10/mes
- **Ahorro:** $120/año ✅

---

## 🔧 **CARACTERÍSTICAS**

### **Soporta 2 Fuentes:**
1. **Google Drive:**
   - Usa `user_google_tokens` para autenticación
   - No requiere migración previa
   - Ideal para archivos grandes (> 1GB)

2. **Supabase Storage:**
   - Bucket `course-documents`
   - Límite: 1GB por archivo
   - Más rápido para archivos pequeños

### **Manejo de Errores:**
- Token expirado → Marca job como failed
- Error de parsing → Marca job como failed
- Timeout → Cloud Function reinicia automáticamente
- Jobs atascados → Botón "Cancelar" en UI

---

## 📊 **MONITOREO**

### **Ver Jobs Activos (Supabase SQL):**
```sql
SELECT 
  id, 
  file_name, 
  status, 
  created_at,
  error_message
FROM file_processing_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;
```

### **Ver Chunks Procesados:**
```sql
SELECT 
  material_id, 
  COUNT(*) as total_chunks,
  MAX(chunk_number) as max_chunk
FROM rag_file_chunks
GROUP BY material_id
ORDER BY MAX(created_at) DESC;
```

---

## 🐛 **TROUBLESHOOTING**

### **Error 401 - Token Expirado:**
```
1. Usuario va a /profile
2. Desconecta Google Drive
3. Vuelve a conectar
4. Retry procesamiento
```

### **Job Atascado en "Processing":**
```sql
-- Opción 1: UI - Botón "Cancelar" en /teacher/materials

-- Opción 2: SQL Manual
UPDATE file_processing_jobs
SET status = 'failed',
    error_message = 'Cancelado manualmente',
    updated_at = NOW()
WHERE id = '<job_id>';
```

### **Cloud Function No Responde:**
```bash
# Verificar estado
gcloud functions describe rag-worker \
  --region=us-central1 \
  --project=eduspark-py

# Ver últimos logs
gcloud functions logs read rag-worker \
  --region=us-central1 \
  --limit=20
```

---

## 📝 **FUNCIONES CLAVE**

### **Frontend (`teacherCourses.ts`):**
```typescript
processMaterialForRAG(materialId, courseId): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}>

cancelProcessingJob(jobId): Promise<{
  success: boolean;
  error?: string;
}>
```

### **Cloud Function (`index.js`):**
```javascript
exports.processRagJobs = async (req, res) => {
  // 1. Fetch pending job
  // 2. Mark as processing
  // 3. Download PDF (Drive or Storage)
  // 4. Extract text
  // 5. Split into chunks
  // 6. Generate embeddings
  // 7. Save to rag_file_chunks
  // 8. Mark as completed
}
```

---

## 🎯 **PRÓXIMOS PASOS (Documentados)**

1. **UI Cleanup:** Consolidar botones en dropdown (ver `docs/PROXIMA_SESION_UI_MATERIALS.md`)
2. **Metrics:** Añadir observabilidad con Cloud Monitoring
3. **Retry Logic:** Implementar reintentos automáticos para errores transitorios
4. **Batch Processing:** Procesar múltiples archivos en paralelo

---

## 📚 **DOCUMENTACIÓN RELACIONADA**

- `docs/RAG_WORKER_DEPLOYMENT.md` - Deployment completo
- `docs/RAG_WORKER_TODO.md` - Mejoras pendientes
- `docs/RAG_WORKER_ON_DEMAND.md` - Arquitectura on-demand
- `docs/PROXIMA_SESION_UI_MATERIALS.md` - Plan UI cleanup

---

## ✅ **ESTADO ACTUAL**

**Última prueba exitosa:** 2025-11-30  
**Archivos procesados:** 6 PDFs pequeños  
**Tasa de éxito:** 100% (después de fix de token)  
**Performance:** 1-3 minutos por PDF (10-50 páginas)  
**Status:** ✅ **PRODUCCIÓN - OPERATIVO**
