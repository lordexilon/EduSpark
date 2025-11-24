# Arquitectura de Datos - Procesamiento de Archivos RAG

## 📋 Resumen

Este documento explica dónde se guarda la información durante el procesamiento de archivos para el sistema RAG (Retrieval Augmented Generation).

## 🗄️ Arquitectura de Almacenamiento

### **Firestore (Firebase)** - Estado Temporal del Procesamiento

**Propósito**: Almacenar el estado y progreso de los trabajos de procesamiento en tiempo real.

**Colección**: `file_processing_jobs`

**Datos almacenados**:
```typescript
{
  id: string;                    // ID único del job
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sourceFileId: string;          // ID del archivo en Google Drive
  sourceFileName: string;        // Nombre del archivo
  courseId: string;              // ID del curso
  pdfType: 'text' | 'scanned' | 'unknown';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    userId: string;              // ID del usuario que inició el procesamiento
    chunkSize: number;           // Tamaño de chunks (default: 25 páginas)
    estimatedCosts: {...};        // Costos estimados
    category: string;             // Categoría del material
    materialId: string;          // ID del material en Supabase
  }
}
```

**¿Por qué Firestore?**
- ✅ Actualizaciones en tiempo real (listeners)
- ✅ Ideal para estados temporales
- ✅ Escalable para múltiples usuarios
- ✅ Sincronización automática entre clientes

---

### **Supabase (PostgreSQL)** - Datos Permanentes

#### 1. **Tabla: `materials`** - Metadatos del Material

**Propósito**: Almacenar información sobre los materiales procesados.

**Campos principales**:
```sql
- id: uuid (PK)
- course_id: integer (FK a courses)
- title: text
- kind: 'pdf' | 'markdown' | 'link' | 'video' | 'other'
- category: 'book' | 'bibliography' | 'syllabus' | 'exam' | 'pamphlet' | 'other'
- mime_type: text
- size_bytes: bigint
- rag_status: 'pending' | 'processing' | 'completed' | 'failed'
- purpose: 'rag' | 'download' | 'both'
- processed_at: timestamptz
- rag_error: text
- metadata: jsonb {
    sourceFileId: string,      // ID del archivo en Google Drive
    pdfType: string,
    requiresOCR: boolean,
    isImage: boolean
  }
```

**¿Por qué Supabase?**
- ✅ Relaciones con cursos, unidades, sesiones
- ✅ Consultas SQL complejas
- ✅ Integración con RLS (Row Level Security)
- ✅ Datos estructurados y relacionales

#### 2. **Tabla: `course_content_chunks`** - Chunks Procesados para RAG

**Propósito**: Almacenar los chunks de texto con sus embeddings para búsqueda vectorial.

**Campos principales**:
```sql
- id: uuid (PK)
- course_id: integer (FK a courses)
- content: text                    // Texto del chunk
- embedding: vector(768)           // Embedding generado por Gemini
- chunk_index: integer              // Índice del chunk en el documento
- metadata: jsonb {
    material_id: string,           // ID del material en materials
    sourceFileId: string,          // ID del archivo en Google Drive
    page_number: number,
    pdfType: string,
    category: string
  }
- created_at: timestamptz
```

**¿Por qué Supabase?**
- ✅ Extensión `pgvector` para búsqueda vectorial
- ✅ Búsqueda de similitud de cosenos
- ✅ Datos permanentes para RAG
- ✅ Relación directa con cursos

---

## 🔄 Flujo de Procesamiento

### 1. **Análisis del Archivo** (`analyzeFile` Cloud Function)
- ✅ Lee metadata del archivo desde Google Drive
- ✅ Detecta tipo (PDF texto, PDF escaneado, imagen)
- ✅ Estima costos y tiempo de procesamiento
- ✅ **NO guarda nada aún** - solo análisis

### 2. **Creación del Job** (`createFileProcessingJob` Cloud Function)
- ✅ Crea registro en **Firestore** (`file_processing_jobs`)
- ✅ Crea registro en **Supabase** (`materials`) con `rag_status: 'pending'`
- ✅ El job queda en estado `pending` esperando procesamiento

### 3. **Procesamiento Asíncrono** (`processFileJob` Cloud Function)
- ✅ **Se activa automáticamente** cuando se crea un job en Firestore (Firestore Trigger)
- ✅ Cambia estado en **Firestore** a `processing`
- ✅ Actualiza `rag_status` en **Supabase** a `processing`
- ✅ Obtiene token de Google Drive del usuario desde Supabase
- ✅ Descarga archivo desde Google Drive
- ✅ Extrae texto:
  - PDFs de texto: Extracción directa con `pdf-parse`
  - PDFs escaneados/Imágenes: OCR con Google Vision API REST
- ✅ Divide en chunks (configurable, default: 25 páginas por chunk)
- ✅ Genera embeddings con Gemini API (`text-embedding-004`)
- ✅ **Guarda chunks directamente en Supabase** (`course_content_chunks`) con embeddings
- ✅ Actualiza estados finales en Firestore y Supabase

### 4. **Finalización**
- ✅ Cambia estado en **Firestore** a `completed`
- ✅ Actualiza `rag_status` en **Supabase** a `completed`
- ✅ Guarda `processed_at` en **Supabase**

---

## 🎯 ¿Dónde se Guarda Cada Dato?

| Dato | Firestore | Supabase | ¿Por qué? |
|------|-----------|----------|-----------|
| Estado del job | ✅ `file_processing_jobs` | ❌ | Tiempo real, temporal |
| Metadatos del material | ❌ | ✅ `materials` | Permanente, relacional |
| Chunks procesados | ❌ | ✅ `course_content_chunks` | Búsqueda vectorial |
| Embeddings | ❌ | ✅ `course_content_chunks.embedding` | pgvector |
| Progreso en tiempo real | ✅ `file_processing_jobs.status` | ❌ | Listeners en tiempo real |
| Estado final (completado) | ✅ | ✅ `materials.rag_status` | Sincronizado |

---

## 🔍 Verificación de Archivos Procesados

El sistema verifica en **ambos lugares** para determinar si un archivo ya fue procesado:

1. **Firestore**: Busca jobs con `status: 'completed'` y `sourceFileId` coincidente
2. **Supabase**: Busca materiales con `rag_status: 'completed'` y `metadata->sourceFileId` coincidente

Si encuentra en cualquiera de los dos, el archivo se marca como "Ya procesado" y muestra el botón "Re-procesar" en lugar de "Analizar".

---

## ⚠️ Re-procesamiento

Si un archivo ya fue procesado:
- ✅ Se muestra botón **"Re-procesar"** (naranja) en lugar de "Analizar" (azul)
- ✅ Requiere confirmación del usuario (puede duplicar chunks)
- ✅ Crea un nuevo job en Firestore
- ✅ Puede crear nuevos chunks en Supabase (duplicados)

**Recomendación**: Solo re-procesar si:
- El archivo fue modificado
- Hubo un error en el procesamiento anterior
- Necesitas actualizar los chunks

---

## 📊 Consultas Útiles

### Ver materiales procesados en Supabase:
```sql
SELECT id, title, rag_status, processed_at, metadata->>'sourceFileId' as file_id
FROM materials
WHERE rag_status = 'completed';
```

### Ver chunks de un material:
```sql
SELECT id, chunk_index, content, metadata
FROM course_content_chunks
WHERE metadata->>'material_id' = 'uuid-del-material'
ORDER BY chunk_index;
```

### Ver jobs en Firestore:
```javascript
// Desde el frontend
const jobs = await getAllJobs(userId);
const completed = jobs.filter(j => j.status === 'completed');
```

---

## ✅ Implementación Completada

1. ✅ **Función `processFileJob` creada y desplegada**
   - Se activa automáticamente cuando se crea un job
   - Procesa archivos y guarda chunks en Supabase
   - Soporta PDFs, imágenes y OCR

2. ✅ **Guardado directo en Supabase**
   - Los chunks se guardan directamente en `course_content_chunks`
   - Embeddings en formato array (768 dimensiones)
   - Listos para consulta por A2A

3. ✅ **Sincronización de estados**
   - Actualiza `rag_status` en `materials`
   - Actualiza estado del job en Firestore
   - Manejo de errores completo

## 🚀 Próximos Pasos (Opcionales)

1. Implementar limpieza de chunks duplicados al re-procesar
2. Agregar dashboard de estadísticas de procesamiento
3. Implementar notificaciones push cuando el procesamiento termine
4. Agregar retry automático para jobs fallidos

