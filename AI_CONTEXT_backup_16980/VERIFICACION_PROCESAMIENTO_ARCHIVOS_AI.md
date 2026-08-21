# Verificación del Procesamiento de Archivos para IA (RAG)

## 📋 Resumen del Flujo Completo

### 1. **Inicio del Proceso**

Cuando se sube un archivo (PDF/PPT) o se indexa contenido de texto:

```
Usuario sube archivo → Frontend → Cloud Function → file_processing_jobs (Supabase)
```

### 2. **Tipos de Trabajos (Jobs)**

El sistema maneja 3 tipos de trabajos:

#### A. **`split`** - Análisis inicial del archivo
- **Objetivo**: Analizar el archivo y dividirlo en trabajos más pequeños
- **Proceso**:
  1. Descarga el archivo (desde Supabase Storage o Google Drive)
  2. Detecta el tipo de PDF (texto, escaneado, mixto)
  3. Cuenta el total de páginas
  4. Crea trabajos hijos de tipo `process_chunk` (25 páginas por chunk)
  5. Actualiza el trabajo principal como `completed`

**Archivo**: `src/workers/file-processing-worker/worker.ts` (líneas 19-96)

#### B. **`process_chunk`** - Procesamiento de un rango de páginas
- **Objetivo**: Extraer texto, generar embeddings y guardar chunks
- **Proceso**:
  1. Descarga el archivo completo
  2. Extrae texto del rango de páginas (ej: páginas 1-25)
  3. Divide el texto en chunks pequeños (~32,000 caracteres cada uno)
  4. Genera embeddings usando Gemini API (`text-embedding-004`)
  5. Guarda chunks con embeddings en `course_content_chunks` (Supabase)
  6. Verifica si el material está completo

**Archivo**: `src/workers/file-processing-worker/worker.ts` (líneas 101-218)

#### C. **`index_text_content`** - Procesamiento directo de texto
- **Objetivo**: Indexar contenido de texto sin archivo PDF
- **Proceso**:
  1. Recibe texto directamente (sin archivo)
  2. Limpia HTML si es necesario
  3. Divide en chunks
  4. Genera embeddings
  5. Guarda en Supabase

**Archivo**: `src/workers/file-processing-worker/worker.ts` (líneas 223-320)

---

## 🔄 Ciclo del Worker

El worker se ejecuta cada 30 segundos (configurable con `WORKER_INTERVAL_MS`):

```typescript
// src/workers/file-processing-worker/index.ts
setInterval(async () => {
  await runWorker();
}, WORKER_INTERVAL); // Default: 30000ms (30 segundos)
```

**Flujo del ciclo**:
1. Consulta trabajos pendientes: `getPendingJobs()` → `file_processing_jobs WHERE status = 'pending' LIMIT 10`
2. Procesa cada trabajo según su tipo (`split`, `process_chunk`, `index_text_content`)
3. Actualiza el estado del trabajo (`processing` → `completed` o `failed`)

---

## 🛠️ Componentes Principales

### 1. **Supabase Service** (`supabaseService.ts`)
- ✅ **Mejorado con Circuit Breaker y Retry**
- Funciones principales:
  - `getPendingJobs()`: Obtiene trabajos pendientes (con retry y circuit breaker)
  - `updateJob()`: Actualiza estado del trabajo (con retry)
  - `saveChunk()` / `saveChunksBatch()`: Guarda chunks con embeddings
  - `downloadFileFromBucket()`: Descarga archivos desde Supabase Storage

### 2. **PDF Processor** (`pdfProcessor.ts`)
- `detectPdfType()`: Detecta si es texto, escaneado o mixto
- `countPdfPages()`: Cuenta páginas del PDF
- `extractTextFromPages()`: Extrae texto de un rango de páginas (con OCR si es necesario)

### 3. **Chunk Processor** (`chunkProcessor.ts`)
- `splitIntoChunks()`: Divide texto en chunks de ~32,000 caracteres
- `processTextIntoChunks()`: Procesa texto con metadata (páginas, nombre archivo, etc.)

### 4. **Gemini Service** (`geminiService.ts`)
- `generateEmbedding()`: Genera embedding para un texto usando Gemini API
- `generateEmbeddingsBatch()`: Procesa múltiples textos en lotes de 5 (con delay de 200ms)

### 5. **Drive Service** (`driveService.ts`)
- Descarga archivos desde Google Drive (si el archivo viene de Drive)

### 6. **Material Service** (`materialService.ts`)
- Obtiene información del material (unit_id, session_id)
- Actualiza estado RAG del material

---

## 🗄️ Estructura de Datos

### Tabla: `file_processing_jobs`
```sql
- id: UUID
- status: 'pending' | 'processing' | 'completed' | 'failed'
- bucket_path: TEXT (ruta en Supabase Storage)
- file_name: TEXT
- course_id: INTEGER
- material_id: UUID (opcional)
- metadata: JSONB (jobType, pageStart, pageEnd, pdfType, etc.)
- error_message: TEXT
- created_at, updated_at: TIMESTAMP
```

### Tabla: `course_content_chunks`
```sql
- id: UUID
- course_id: INTEGER
- content: TEXT (texto del chunk)
- embedding: VECTOR(768) (embedding de Gemini)
- metadata: JSONB (sourceFileName, pageStart, pageEnd, pdfType, materialId, unitId, sessionId)
- chunk_index: INTEGER
- unit_id: UUID (opcional)
- session_id: UUID (opcional)
- created_at: TIMESTAMP
```

---

## ✅ Mejoras Implementadas (Paso 3)

### 1. **Circuit Breaker**
- **Ubicación**: `src/workers/file-processing-worker/retryUtils.ts`
- **Funcionalidad**:
  - Se abre después de 5 fallos consecutivos
  - Bloquea solicitudes durante 1 minuto
  - Estado `half-open` para probar recuperación
  - Evita saturar el servidor durante problemas

### 2. **Backoff Exponencial**
- **Configuración**:
  - Delay inicial: 2 segundos
  - Multiplicador: 2x
  - Delay máximo: 30 segundos
  - Máximo reintentos: 3

### 3. **Timeouts**
- `getPendingJobs()`: 10 segundos
- `updateJob()`: 8 segundos

### 4. **Detección de Errores**
- Detecta errores 522, 503, 504 del servidor
- Detecta errores de red (timeouts, conexión)
- Retorna array vacío en lugar de lanzar errores (evita detener el worker)

---

## 🔍 Puntos de Verificación

### ✅ Verificar que el Worker está funcionando:
```bash
# Ver logs del worker
# En Cloud Run o localmente, deberías ver:
[Worker] Iniciando ciclo de procesamiento...
[Worker] Encontrados X trabajos pendientes
[Split] Procesando trabajo...
[Chunk] Procesando trabajo...
```

### ✅ Verificar que los chunks se están guardando:
```sql
-- En Supabase SQL Editor
SELECT 
  COUNT(*) as total_chunks,
  COUNT(DISTINCT course_id) as cursos,
  COUNT(DISTINCT metadata->>'materialId') as materiales
FROM course_content_chunks;
```

### ✅ Verificar trabajos pendientes:
```sql
SELECT 
  status,
  COUNT(*) as cantidad,
  job_type,
  MAX(created_at) as ultimo_trabajo
FROM file_processing_jobs
GROUP BY status, job_type
ORDER BY status;
```

### ✅ Verificar errores:
```sql
SELECT 
  id,
  file_name,
  status,
  error_message,
  created_at
FROM file_processing_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 Problemas Comunes y Soluciones

### 1. **Errores 522 (Connection Timeout)**
- **Causa**: Servidor de Supabase no responde
- **Solución**: 
  - Circuit breaker activado (bloquea solicitudes)
  - Retry con backoff exponencial
  - Reiniciar proyecto de Supabase si persiste

### 2. **Worker no procesa trabajos**
- **Verificar**: 
  - Que el worker esté corriendo
  - Que haya trabajos con `status = 'pending'`
  - Logs del worker para errores

### 3. **Embeddings no se generan**
- **Verificar**:
  - `GEMINI_API_KEY` está configurada
  - Límites de rate de Gemini API
  - Logs de `geminiService.ts`

### 4. **Chunks no se guardan**
- **Verificar**:
  - Conexión a Supabase
  - Permisos de la service role key
  - Logs de `supabaseService.ts`

---

## 📊 Métricas a Monitorear

1. **Tiempo de procesamiento**:
   - Split job: ~30-60 segundos
   - Process chunk: ~2-5 minutos (depende del tamaño)
   - Index text: ~10-30 segundos

2. **Tasa de éxito**:
   - Trabajos completados vs fallidos
   - Chunks guardados por trabajo

3. **Uso de recursos**:
   - Llamadas a Gemini API
   - Consultas a Supabase
   - Uso de memoria/CPU del worker

---

## 🔗 Archivos Relacionados

- `src/workers/file-processing-worker/index.ts` - Punto de entrada
- `src/workers/file-processing-worker/worker.ts` - Lógica principal
- `src/workers/file-processing-worker/supabaseService.ts` - Interacción con Supabase
- `src/workers/file-processing-worker/retryUtils.ts` - Circuit breaker y retry
- `src/workers/file-processing-worker/pdfProcessor.ts` - Procesamiento de PDFs
- `src/workers/file-processing-worker/chunkProcessor.ts` - División en chunks
- `src/workers/file-processing-worker/geminiService.ts` - Generación de embeddings

---

**Última actualización**: Después de implementar mejoras de resiliencia (Circuit Breaker, Retry, Timeouts)

