# Solución: Procesamiento de Archivos Muy Grandes (900MB+)

## Problema

Archivos PDF de **900MB o más** no pueden procesarse con la configuración actual debido a:

1. **Limitaciones de memoria**: Máximo 8GB disponible (limitado por cuota de Cloud Functions)
2. **Consumo de RAM**: La extracción de texto puede requerir 10-20x el tamaño del archivo
3. **Timeouts**: Procesamiento puede exceder el límite de 1 hora

## Estado Actual

| Configuración | Valor |
|--------------|-------|
| Memoria | 8GB |
| CPU | 2 cores |
| Timeout | 3600s (1 hora) |
| Instancias máximas | 5 |

| Tamaño archivo | Estado | Tiempo estimado |
|----------------|--------|----------------|
| 55MB | ✅ Funciona | 2-3 minutos |
| 110MB | ⚠️ Límite | 8-15 minutos |
| 200MB+ | ❌ Probablemente falle | >20 minutos + timeout |
| 900MB | ❌ No viable | Out of memory / timeout |

## Soluciones Propuestas

### Opción 1: División de PDF en partes (Recomendado) ⭐

**Ventajas:**
- Usa la infraestructura actual
- Más confiable para archivos grandes
- Permite paralelizar el procesamiento

**Implementación:**

1. **Detección de archivos grandes**
```javascript
// En analyzeFile o createFileProcessingJob
if (fileSize > 200 * 1024 * 1024) { // >200MB
  // Marcar para división
  job.metadata.requiresSplitting = true;
  job.metadata.targetPartSizeMB = 100; // Dividir en partes de 100MB
}
```

2. **División del PDF**
```javascript
// Usar pdf-lib o similar para dividir
const PDFDocument = require('pdf-lib').PDFDocument;

async function splitLargePDF(pdfPath, pagesPerPart = 100) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  const parts = [];
  for (let i = 0; i < totalPages; i += pagesPerPart) {
    const partDoc = await PDFDocument.create();
    const pagesToCopy = await pdfDoc.copyPages(
      pdfDoc, 
      Array.from({length: Math.min(pagesPerPart, totalPages - i)}, (_, j) => i + j)
    );
    
    pagesToCopy.forEach(page => partDoc.addPage(page));
    const partBytes = await partDoc.save();
    parts.push(partBytes);
  }
  
  return parts;
}
```

3. **Crear sub-jobs**
```javascript
// Crear un job principal y múltiples sub-jobs
const mainJob = {
  id: mainJobId,
  status: 'processing',
  subJobs: []
};

for (let i = 0; i < parts.length; i++) {
  const subJob = await createSubJob({
    parentJobId: mainJobId,
    part: i,
    totalParts: parts.length,
    pdfPart: parts[i]
  });
  mainJob.subJobs.push(subJob.id);
}
```

4. **Consolidar resultados**
```javascript
// Cuando todos los sub-jobs terminan
async function consolidateSubJobs(mainJobId) {
  const subJobs = await getSubJobs(mainJobId);
  const allChunks = subJobs.flatMap(job => job.chunks);
  
  // Actualizar el job principal
  await updateJob(mainJobId, {
    status: 'completed',
    chunksProcessed: allChunks.length,
    chunksTotal: allChunks.length
  });
}
```

**Esfuerzo de implementación:** Medio (1-2 días)

---

### Opción 2: Procesamiento por páginas/streaming

**Ventajas:**
- No requiere dividir el archivo
- Memoria más predecible

**Desventajas:**
- Más lento (procesamiento secuencial)
- Puede seguir teniendo timeouts

**Implementación:**

```javascript
async function extractTextPageByPage(pdfPath) {
  const pdf = await pdfParse.PDF.load(pdfPath);
  let allText = '';
  
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    allText += text;
    
    // Liberar memoria de la página
    page.cleanup();
    
    // Reportar progreso
    if (i % 10 === 0) {
      await updateJobProgress(jobId, { pagesProcessed: i });
    }
  }
  
  return allText;
}
```

**Esfuerzo de implementación:** Medio (1 día)

---

### Opción 3: Migrar a Cloud Run Jobs

**Ventajas:**
- Hasta 32GB de RAM disponible
- Mejor para procesamiento batch
- Más control sobre recursos

**Desventajas:**
- Requiere refactorización significativa
- Cambio de arquitectura

**Implementación:**

1. Crear un nuevo servicio Cloud Run Job
2. Migrar el código del `rag-worker`
3. Ajustar el scheduler para invocar Cloud Run Jobs en lugar de Cloud Functions

**Esfuerzo de implementación:** Alto (3-5 días)

---

### Opción 4: Límite de tamaño de archivo

**La opción más simple pero menos flexible**

```javascript
// En el frontend
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

if (fileSize > MAX_FILE_SIZE) {
  alert('El archivo es demasiado grande. El tamaño máximo es 200MB. Por favor, divida el archivo manualmente.');
  return;
}
```

**Ventajas:**
- Implementación inmediata
- No requiere cambios en el backend

**Desventajas:**
- Limita la funcionalidad
- Requiere trabajo manual del usuario

---

## Recomendación

**Para el corto plazo (ahora):**
- Limitar archivos a 200MB en el frontend
- Mostrar mensaje claro al usuario

**Para el mediano plazo (próxima sprint):**
- Implementar **Opción 1: División de PDF en partes**
- Es la solución más flexible y escalable
- Permite procesar archivos de cualquier tamaño

**Código para límite inmediato:**

```typescript
// En FileProcessingPage.tsx, en la función de análisis
const MAX_FILE_SIZE_MB = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const handleAnalyze = async (file) => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    toast.error(
      `El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
      `El tamaño máximo es ${MAX_FILE_SIZE_MB}MB. ` +
      `Por favor, divida el archivo en partes más pequeñas.`
    );
    return;
  }
  
  // Continuar con el análisis...
};
```

## Monitoreo

Para identificar archivos problemáticos:

```sql
-- Encontrar jobs que tardan mucho o fallan
SELECT 
  j.id,
  j.source_file_name,
  j.metadata->>'fileSize' as file_size_mb,
  j.status,
  j.created_at,
  j.updated_at,
  EXTRACT(EPOCH FROM (j.updated_at - j.created_at))/60 as minutes_elapsed
FROM file_processing_jobs j
WHERE j.status IN ('processing', 'failed')
  AND EXTRACT(EPOCH FROM (NOW() - j.created_at))/60 > 15
ORDER BY j.created_at DESC;
```

## Próximos Pasos

1. ✅ Aumentar RAM del `rag-worker` a 8GB (completado)
2. ⏳ Verificar si archivos de 110MB se procesan correctamente
3. ⏳ Implementar límite de 200MB en el frontend (inmediato)
4. ⏳ Planificar implementación de división de PDFs (próxima sprint)

