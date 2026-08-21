# 🔄 Workers de Procesamiento de Archivos - Guía de Referencia

**Fecha:** 2025-12-08  
**Estado:** Sistema Dual (Migración en Progreso)

---

## 📊 Resumen de Workers

Actualmente existen **DOS workers** para procesamiento de archivos:

| Worker | Ubicación | Tecnología | Estado | Uso |
|--------|-----------|------------|--------|-----|
| **rag-worker** | `functions/rag-worker/` | Cloud Functions | ⚠️ Legacy | Sistema antiguo |
| **file-processing-worker** | `src/workers/file-processing-worker/` | Cloud Run | ✅ Activo | Sistema actual |

---

## 🎯 file-processing-worker (ACTUAL)

### **Ubicación:**
- **Código:** `src/workers/file-processing-worker/`
- **Deploy:** Cloud Run
- **URL:** TBD (después del deployment)

### **Características:**
- ✅ Procesamiento página por página (evita "Invalid string length")
- ✅ Captura páginas REALES del PDF
- ✅ Sistema de jobs con Firestore
- ✅ Soporte para Google Drive y Supabase Storage
- ✅ Manejo robusto de errores
- ✅ Logs de progreso detallados

### **Deployment:**
```bash
cd src/workers/file-processing-worker
gcloud run deploy file-processing-worker \
  --source . \
  --region us-central1 \
  --memory 2Gi \
  --timeout 540s \
  --allow-unauthenticated
```

### **Variables de Entorno:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `CHUNK_SIZE=25`

### **Tablas Usadas:**
- `file_processing_jobs` (Firestore)
- `course_content_chunks` (Supabase)
- `materials` (Supabase)

---

## ⚠️ rag-worker (LEGACY)

### **Ubicación:**
- **Código:** `functions/rag-worker/`
- **Deploy:** Cloud Functions
- **URL:** `https://rag-worker-mcc5aevj6a-uc.a.run.app`

### **Características:**
- ❌ Extrae TODO el PDF de una vez (causa "Invalid string length")
- ❌ Páginas estimadas (incorrectas)
- ⚠️ Sistema antiguo de jobs
- ⚠️ Solo Supabase Storage

### **Estado:**
- **NO USAR** para archivos nuevos
- Mantener solo para compatibilidad con jobs antiguos
- Migrar a `file-processing-worker` cuando sea posible

### **Deployment (Solo si es necesario):**
```bash
cd functions/rag-worker
gcloud functions deploy rag-worker \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=processRagJobs \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=540s \
  --memory=2GB
```

---

## 🔄 Migración

### **Cuándo Usar Cada Worker:**

#### **Usar file-processing-worker (RECOMENDADO):**
- ✅ Archivos nuevos (Harrison 21ª, etc.)
- ✅ Archivos grandes (>50 MB)
- ✅ Cuando necesitas páginas reales
- ✅ Procesamiento desde Google Drive
- ✅ Cualquier caso nuevo

#### **Usar rag-worker (SOLO SI ES NECESARIO):**
- ⚠️ Jobs antiguos que ya están en progreso
- ⚠️ Compatibilidad con sistema legacy
- ❌ **NO usar para archivos nuevos**

---

## 📝 Diferencias Técnicas

### **Extracción de Texto:**

**rag-worker (Legacy):**
```javascript
// ❌ Extrae todo de una vez
const data = await pdfParse(pdfBuffer);
const fullText = data.text; // Puede causar "Invalid string length"
```

**file-processing-worker (Actual):**
```typescript
// ✅ Procesa página por página
for (let pageNum = start; pageNum <= end; pageNum++) {
  const singlePagePdf = await PDFDocument.create();
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
  // Extrae solo esta página
}
```

### **Páginas:**

**rag-worker (Legacy):**
```javascript
// ❌ Páginas estimadas (incorrectas)
const estimatedPage = Math.floor(chunkIndex * totalPages / totalChunks);
// Resultado: 11321-11331 (incorrecto)
```

**file-processing-worker (Actual):**
```typescript
// ✅ Páginas reales del PDF
pageStart: job.pageStart, // 1-25 (real)
pageEnd: job.pageEnd,     // 1-25 (real)
```

---

## 🚀 Próximos Pasos

1. **Completar deployment de file-processing-worker**
2. **Probar con Harrison 21ª**
3. **Verificar páginas reales en BD**
4. **Deprecar rag-worker** (cuando todos los jobs migren)

---

## 📊 Estado Actual del Deployment

### **file-processing-worker:**
- ⏳ **En progreso** (Building Container)
- 📍 **Región:** us-central1
- 💾 **Memoria:** 2Gi
- ⏱️ **Timeout:** 540s

### **rag-worker:**
- ✅ **Deployado** (Legacy)
- ⚠️ **No usar** para archivos nuevos

---

**Última actualización:** 2025-12-08  
**Autor:** Sistema EduSpark
