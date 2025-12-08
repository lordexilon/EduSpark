# Plan de Implementación: Soporte para Archivos de 900MB

## Objetivo
Permitir el procesamiento de archivos PDF de hasta 900MB mediante división automática en partes manejables.

## Arquitectura Propuesta

```
Archivo 900MB
    ↓
analyzeFile detecta archivo grande (>150MB)
    ↓
createFileProcessingJob crea job principal con metadata.requiresSplitting = true
    ↓
rag-worker detecta flag requiresSplitting
    ↓
Divide PDF en partes de 100MB (9 partes)
    ↓
Crea 9 sub-jobs independientes
    ↓
Cada sub-job se procesa en paralelo (scheduler los toma de 2 en 2)
    ↓
Cuando todos completan, consolida resultados en job principal
    ↓
Material marcado como 'completed'
```

## Fase 1: Backend - Detección y Flag (30 min)

### 1.1 Modificar `analyzeFile` Cloud Function

**Archivo:** `functions/analyzeFile/index.js`

```javascript
// Agregar detección de archivos grandes
const LARGE_FILE_THRESHOLD = 150 * 1024 * 1024; // 150MB
const TARGET_PART_SIZE = 100 * 1024 * 1024; // 100MB por parte

if (fileSize > LARGE_FILE_THRESHOLD) {
  const estimatedParts = Math.ceil(fileSize / TARGET_PART_SIZE);
  
  analysis.requiresSplitting = true;
  analysis.targetPartSizeMB = 100;
  analysis.estimatedParts = estimatedParts;
  
  console.log(`[analyzeFile] Archivo grande detectado: ${fileSize} bytes, se dividirá en ${estimatedParts} partes`);
}
```

### 1.2 Modificar `createFileProcessingJob` Cloud Function

**Archivo:** `functions/createFileProcessingJob/index.ts`

```typescript
// Pasar flag de splitting al job
const jobData = {
  id: jobId,
  userId,
  sourceFileId: fileId,
  sourceFileName: fileName,
  status: 'pending',
  materialId,
  metadata: {
    ...existingMetadata,
    requiresSplitting: requiresSplitting || false,
    targetPartSizeMB: targetPartSizeMB || 100,
    estimatedParts: estimatedParts || 1,
    isSubJob: false, // Flag para identificar jobs principales
    parentJobId: null
  }
};
```

## Fase 2: Backend - División de PDFs (4 horas)

### 2.1 Instalar dependencia pdf-lib

**Archivo:** `functions/rag-worker/package.json`

```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",
    // ... otras dependencias existentes
  }
}
```

### 2.2 Crear función de división de PDF

**Archivo:** `functions/rag-worker/pdfSplitter.js` (nuevo)

```javascript
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Divide un PDF grande en múltiples partes
 * @param {Buffer} pdfBuffer - Buffer del PDF completo
 * @param {number} pagesPerPart - Páginas por parte (default: 100)
 * @returns {Promise<Array<{buffer: Buffer, startPage: number, endPage: number}>>}
 */
async function splitPDF(pdfBuffer, pagesPerPart = 100) {
  console.log(`[PDFSplitter] Iniciando división de PDF (${pdfBuffer.length} bytes)`);
  
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = pdfDoc.getPageCount();
  
  console.log(`[PDFSplitter] Total de páginas: ${totalPages}`);
  
  const parts = [];
  
  for (let i = 0; i < totalPages; i += pagesPerPart) {
    const startPage = i;
    const endPage = Math.min(i + pagesPerPart - 1, totalPages - 1);
    const pageCount = endPage - startPage + 1;
    
    console.log(`[PDFSplitter] Creando parte ${parts.length + 1}: páginas ${startPage + 1}-${endPage + 1}`);
    
    // Crear nuevo documento para esta parte
    const partDoc = await PDFDocument.create();
    
    // Copiar páginas
    const pageIndices = Array.from({ length: pageCount }, (_, j) => startPage + j);
    const copiedPages = await partDoc.copyPages(pdfDoc, pageIndices);
    
    copiedPages.forEach(page => partDoc.addPage(page));
    
    // Guardar como buffer
    const partBytes = await partDoc.save();
    
    parts.push({
      buffer: Buffer.from(partBytes),
      startPage: startPage + 1,
      endPage: endPage + 1,
      pageCount: pageCount,
      partNumber: parts.length + 1
    });
    
    console.log(`[PDFSplitter] Parte ${parts.length} creada: ${partBytes.length} bytes`);
  }
  
  console.log(`[PDFSplitter] División completada: ${parts.length} partes`);
  
  return parts;
}

/**
 * Guarda las partes del PDF en archivos temporales
 * @param {Array} parts - Partes del PDF
 * @param {string} baseFileName - Nombre base del archivo
 * @returns {Promise<Array<string>>} - Rutas de los archivos temporales
 */
async function savePartsToTemp(parts, baseFileName) {
  const tempDir = os.tmpdir();
  const filePaths = [];
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const fileName = `${baseFileName}_part${i + 1}_of_${parts.length}.pdf`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, part.buffer);
    filePaths.push(filePath);
    
    console.log(`[PDFSplitter] Parte ${i + 1} guardada en: ${filePath}`);
  }
  
  return filePaths;
}

module.exports = {
  splitPDF,
  savePartsToTemp
};
```

### 2.3 Modificar rag-worker para detectar y dividir

**Archivo:** `functions/rag-worker/index.js`

Agregar al inicio del procesamiento:

```javascript
const { splitPDF } = require('./pdfSplitter');

// ... dentro de processRagJobs, después de descargar el archivo

// Verificar si requiere división
if (job.metadata?.requiresSplitting && !job.metadata?.isSubJob) {
  console.log(`[RAG Worker] 📄 Archivo grande detectado, dividiendo PDF...`);
  
  try {
    // Dividir el PDF
    const parts = await splitPDF(pdfBuffer, 100); // 100 páginas por parte
    
    console.log(`[RAG Worker] ✂️ PDF dividido en ${parts.length} partes`);
    
    // Crear sub-jobs para cada parte
    const subJobIds = [];
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Subir la parte a Google Drive o Storage (opcional)
      // Por ahora, la guardaremos como base64 en metadata
      const partBase64 = part.buffer.toString('base64');
      
      const subJobId = `${job.id}_part${i + 1}`;
      
      const subJobData = {
        id: subJobId,
        userId: job.userId,
        sourceFileId: job.sourceFileId,
        sourceFileName: `${job.sourceFileName} (Parte ${i + 1}/${parts.length})`,
        status: 'pending',
        materialId: job.materialId,
        metadata: {
          ...job.metadata,
          isSubJob: true,
          parentJobId: job.id,
          partNumber: i + 1,
          totalParts: parts.length,
          startPage: part.startPage,
          endPage: part.endPage,
          pageCount: part.pageCount,
          pdfPartBase64: partBase64, // O URL si lo subimos a Storage
          requiresSplitting: false // Las partes no requieren división
        }
      };
      
      // Crear sub-job en Supabase
      const { error: subJobError } = await supabase
        .from('file_processing_jobs')
        .insert(subJobData);
      
      if (subJobError) {
        console.error(`[RAG Worker] ❌ Error creando sub-job ${subJobId}:`, subJobError);
      } else {
        subJobIds.push(subJobId);
        console.log(`[RAG Worker] ✅ Sub-job creado: ${subJobId}`);
      }
    }
    
    // Actualizar job principal con referencia a sub-jobs
    await supabase
      .from('file_processing_jobs')
      .update({
        status: 'processing',
        metadata: {
          ...job.metadata,
          subJobIds: subJobIds,
          subJobsCompleted: 0,
          subJobsTotal: parts.length
        }
      })
      .eq('id', job.id);
    
    console.log(`[RAG Worker] ✅ Job principal actualizado con ${subJobIds.length} sub-jobs`);
    
    // Marcar material como 'processing'
    await supabase
      .from('materials')
      .update({ rag_status: 'processing' })
      .eq('id', job.materialId);
    
    // Retornar éxito - los sub-jobs se procesarán en las siguientes ejecuciones del scheduler
    return res.status(200).json({ 
      success: true, 
      message: `Job dividido en ${parts.length} partes`,
      subJobs: subJobIds
    });
    
  } catch (splitError) {
    console.error(`[RAG Worker] ❌ Error dividiendo PDF:`, splitError);
    
    await supabase
      .from('file_processing_jobs')
      .update({
        status: 'failed',
        error: `Error dividiendo PDF: ${splitError.message}`
      })
      .eq('id', job.id);
    
    return res.status(500).json({ 
      success: false, 
      error: splitError.message 
    });
  }
}

// Si es un sub-job, procesar normalmente pero usando pdfPartBase64
if (job.metadata?.isSubJob) {
  console.log(`[RAG Worker] 📄 Procesando sub-job ${job.metadata.partNumber}/${job.metadata.totalParts}`);
  
  // Decodificar la parte del PDF desde base64
  if (job.metadata.pdfPartBase64) {
    pdfBuffer = Buffer.from(job.metadata.pdfPartBase64, 'base64');
    console.log(`[RAG Worker] ✅ Parte del PDF cargada desde metadata (${pdfBuffer.length} bytes)`);
  }
}

// Continuar con el procesamiento normal...
```

### 2.4 Agregar lógica de consolidación

Agregar al final del procesamiento exitoso de un sub-job:

```javascript
// Si es un sub-job y se completó exitosamente
if (job.metadata?.isSubJob && job.metadata?.parentJobId) {
  console.log(`[RAG Worker] ✅ Sub-job completado, verificando job principal...`);
  
  // Obtener job principal
  const { data: parentJob, error: parentError } = await supabase
    .from('file_processing_jobs')
    .select('*')
    .eq('id', job.metadata.parentJobId)
    .single();
  
  if (!parentError && parentJob) {
    const subJobsCompleted = (parentJob.metadata?.subJobsCompleted || 0) + 1;
    const subJobsTotal = parentJob.metadata?.subJobsTotal || 0;
    
    // Actualizar contador de sub-jobs completados
    await supabase
      .from('file_processing_jobs')
      .update({
        metadata: {
          ...parentJob.metadata,
          subJobsCompleted: subJobsCompleted
        }
      })
      .eq('id', parentJob.id);
    
    console.log(`[RAG Worker] 📊 Progreso del job principal: ${subJobsCompleted}/${subJobsTotal} partes completadas`);
    
    // Si todos los sub-jobs completaron, marcar el job principal como completado
    if (subJobsCompleted >= subJobsTotal) {
      console.log(`[RAG Worker] 🎉 Todos los sub-jobs completados, consolidando...`);
      
      // Obtener total de chunks de todos los sub-jobs
      const { data: subJobs } = await supabase
        .from('file_processing_jobs')
        .select('chunksProcessed, chunksTotal')
        .in('id', parentJob.metadata.subJobIds);
      
      const totalChunks = subJobs.reduce((sum, sj) => sum + (sj.chunksProcessed || 0), 0);
      
      // Marcar job principal como completado
      await supabase
        .from('file_processing_jobs')
        .update({
          status: 'completed',
          chunksProcessed: totalChunks,
          chunksTotal: totalChunks,
          completedAt: new Date().toISOString()
        })
        .eq('id', parentJob.id);
      
      // Marcar material como completado
      await supabase
        .from('materials')
        .update({ rag_status: 'completed' })
        .eq('id', parentJob.materialId);
      
      console.log(`[RAG Worker] ✅ Job principal completado con ${totalChunks} chunks totales`);
    }
  }
}
```

## Fase 3: Frontend - Indicador de Progreso (2 horas)

### 3.1 Modificar FileProcessingPage.tsx

Agregar visualización especial para jobs con sub-jobs:

```typescript
// En la sección de renderizado del job
if (job.metadata?.subJobIds && job.metadata?.subJobsTotal > 0) {
  const subJobsCompleted = job.metadata?.subJobsCompleted || 0;
  const subJobsTotal = job.metadata?.subJobsTotal || 0;
  const subJobsProgress = Math.round((subJobsCompleted / subJobsTotal) * 100);
  
  return (
    <div>
      <p className="text-sm text-gray-600">
        Archivo dividido en {subJobsTotal} partes
      </p>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Partes procesadas</span>
          <span>{subJobsCompleted}/{subJobsTotal} ({subJobsProgress}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${subJobsProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

## Fase 4: Testing (2 horas)

### 4.1 Test con archivo de 200MB
1. Subir archivo de 200MB
2. Verificar que se divide en 2 partes
3. Verificar que ambas partes se procesan
4. Verificar que el job principal se marca como completado

### 4.2 Test con archivo de 500MB
1. Subir archivo de 500MB
2. Verificar división en 5 partes
3. Verificar procesamiento en paralelo

### 4.3 Test con archivo de 900MB
1. Subir archivo de 900MB
2. Verificar división en 9 partes
3. Verificar que todas las partes se procesan correctamente
4. Verificar consolidación final

## Cronograma

| Fase | Tiempo | Acumulado |
|------|--------|-----------|
| Fase 1: Detección | 30 min | 30 min |
| Fase 2: División | 4 horas | 4.5 horas |
| Fase 3: Frontend | 2 horas | 6.5 horas |
| Fase 4: Testing | 2 horas | 8.5 horas |
| **TOTAL** | **~1 día** | **8.5 horas** |

## Consideraciones

### Limitación de base64 en metadata
- Los sub-jobs guardan las partes del PDF como base64 en metadata
- Para archivos muy grandes, considerar subir las partes a Google Cloud Storage
- Alternativa: Guardar partes en Storage y pasar URLs en metadata

### Límites de Firestore
- Tamaño máximo de documento: 1MB
- Si las partes en base64 exceden 1MB, DEBE usarse Storage

### Mejora futura: Cloud Storage
```javascript
// Subir parte a Google Cloud Storage
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('eduspark-pdf-parts');

const partFileName = `${job.id}/part_${i + 1}.pdf`;
const file = bucket.file(partFileName);

await file.save(part.buffer);
const partUrl = `gs://eduspark-pdf-parts/${partFileName}`;

// Usar partUrl en lugar de pdfPartBase64
metadata: {
  pdfPartUrl: partUrl,
  // ...
}
```

## Ventajas de esta Solución

✅ Usa infraestructura actual (8GB RAM suficiente para partes de 100MB)  
✅ Procesamiento paralelo (varias partes simultáneamente)  
✅ Escalable (funciona para 900MB, 1GB, 2GB, etc.)  
✅ No requiere cambio de arquitectura  
✅ Tiempo de implementación: 1 día  
✅ Transparente para el usuario (ve progreso por partes)  

## Inicio Inmediato

¿Procedo con la Fase 1 (Detección y Flag) ahora mismo?

