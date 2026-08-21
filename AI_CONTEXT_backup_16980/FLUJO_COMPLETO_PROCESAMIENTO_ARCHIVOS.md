# 🔄 Flujo Completo del Procesamiento de Archivos

**Fecha:** Noviembre 2025  
**Estado:** 📋 DOCUMENTACIÓN COMPLETA DEL FLUJO

---

## 📋 Resumen Ejecutivo

Este documento describe el flujo completo del procesamiento de archivos desde que el usuario hace clic en "Procesar" hasta que el archivo está completamente procesado y listo para usar en el Tutor RAG.

---

## 🔄 Flujo Completo Paso a Paso

### **FASE 1: Análisis del Archivo (Frontend)**

#### Paso 1.1: Usuario selecciona archivo y hace clic en "Analizar"
**Ubicación:** `src/pages/FileProcessingPage.tsx` - función `handleAnalyze`

**Acciones:**
1. Usuario selecciona un archivo de Google Drive
2. Hace clic en botón "Analizar"
3. Se llama a `handleAnalyze(file.id)`

**Logs esperados:**
```
[FileProcessing] Click en Analizar para: [nombre-archivo]
[FileProcessing] Iniciando análisis de archivo: [nombre-archivo]
[FileProcessing] Estado: analyzing = [file-id]
```

**Puntos de fallo:**
- ❌ Archivo no encontrado en Google Drive
- ❌ Error de autenticación con Google Drive
- ❌ Error de red al llamar a `analyzeFile`

---

#### Paso 1.2: Llamada a Cloud Function `analyzeFile`
**Ubicación:** `functions/analyzeFile/index.ts`

**Acciones:**
1. Descarga el archivo desde Google Drive
2. Analiza el PDF (páginas, tipo, tamaño)
3. Calcula costos estimados
4. Retorna análisis al frontend

**Request:**
```typescript
POST https://analyzefile-mcc5aevj6a-uc.a.run.app
Body: {
  fileId: string,
  userId: string
}
```

**Response exitosa:**
```typescript
{
  success: true,
  analysis: {
    fileId: string,
    fileName: string,
    fileSize: number,
    totalPages: number,
    pdfType: 'text' | 'scanned' | 'unknown',
    estimatedCosts: {
      ocr: number,
      embeddings: number,
      cloudRun: number,
      firestore: number,
      total: number,
      processingTime: {
        estimatedMinutes: number,
        estimatedHours: number
      }
    }
  }
}
```

**Logs esperados:**
```
[FileProcessing] Enviando solicitud a: https://analyzefile-mcc5aevj6a-uc.a.run.app
[FileProcessing] Respuesta recibida: 200
[FileProcessing] Datos recibidos: {success: true, analysis: {...}}
[FileProcessing] Análisis completado: {...}
```

**Puntos de fallo:**
- ❌ Error descargando archivo desde Google Drive
- ❌ Archivo corrupto o no es PDF válido
- ❌ Timeout en análisis (archivo muy grande)
- ❌ Error de autenticación con Google Drive

---

### **FASE 2: Creación del Job (Frontend → Backend)**

#### Paso 2.1: Usuario confirma procesamiento
**Ubicación:** `src/pages/FileProcessingPage.tsx` - función `handleProcess`

**Acciones:**
1. Usuario ve el análisis y hace clic en "Procesar"
2. Se muestra modal de confirmación
3. Usuario selecciona curso y categoría
4. Se llama a `handleProcess()`

**Logs esperados:**
```
[FileProcessing] Iniciando procesamiento...
```

**Puntos de fallo:**
- ❌ Usuario no seleccionó curso
- ❌ Error de validación de datos

---

#### Paso 2.2: Crear material en Supabase (opcional)
**Ubicación:** `src/pages/FileProcessingPage.tsx` - función `handleProcess`

**Acciones:**
1. Si no existe `materialId`, crea un nuevo material en Supabase
2. Guarda información básica del archivo
3. Establece `rag_status` según tipo de procesamiento

**Query Supabase:**
```sql
INSERT INTO materials (
  course_id, title, kind, category, rag_status, 
  mime_type, size_bytes, metadata
) VALUES (...)
```

**Logs esperados:**
```
[FileProcessing] Creando material en Supabase...
```

**Puntos de fallo:**
- ❌ Error de conexión con Supabase
- ❌ Error de permisos
- ⚠️ Si falla, continúa sin crear material (no crítico)

---

#### Paso 2.3: Llamada a Cloud Function `createFileProcessingJob`
**Ubicación:** `functions/createFileProcessingJob/index.ts`

**Request`

**Request:**
```typescript
POST https://createfileprocessingjob-mcc5aevj6a-uc.a.run.app
Headers: {
  Authorization: `Bearer ${session.access_token}`
}
Body: {
  fileId: string,
  fileName: string,
  courseId: string,
  userId: string,
  category: string,
  materialId?: string,
  ragProcessingType: 'full' | 'readonly',
  analysis: {
    totalPages: number,
    pdfType: string,
    estimatedCosts: {...}
  }
}
```

**Acciones en `createFileProcessingJob`:**
1. ✅ Validar autenticación (`requireAuth`)
2. ✅ Validar campos requeridos
3. ✅ Crear job en Supabase con estado `pending`
4. ✅ Invocar rag-worker con retry (3 intentos)

**Query Supabase:**
```sql
INSERT INTO file_processing_jobs (
  material_id, course_id, user_id, bucket_path, 
  file_name, status, metadata, created_at, updated_at
) VALUES (...)
```

**Response exitosa:**
```typescript
{
  success: true,
  jobId: string
}
```

**Logs esperados en `createFileProcessingJob`:**
```
[createFileProcessingJob] Cliente de Supabase inicializado correctamente
[createFileProcessingJob] ✅ Job creado en Supabase: [job-id] para archivo [file-id]
[createFileProcessingJob] 🔄 Intento 1/3 de invocar RAG worker para job [job-id]
[createFileProcessingJob] ✅ RAG worker invocado exitosamente en intento 1
```

**Logs esperados en frontend:**
```
[FileProcessing] Respuesta de creación de job: {success: true, jobId: '...'}
[FileProcessing] ✅ Job creado exitosamente: [job-id]
[FileProcessing] Forzando recarga de jobs después de crear job...
[FileProcessing] Jobs cargados manualmente: 1
```

**Puntos de fallo:**
- ❌ Error de autenticación
- ❌ Error creando job en Supabase
- ⚠️ Error invocando rag-worker (job queda en `pending`, se procesará por scheduler)

---

### **FASE 3: Procesamiento del Job (RAG Worker)**

#### Paso 3.1: RAG Worker obtiene job pendiente
**Ubicación:** `functions/rag-worker/index.js` - función `processRagJobs`

**Trigger:** 
- Invocación HTTP desde `createFileProcessingJob` (con retry)
- Cloud Scheduler cada 2 minutos (recomendado)
- Invocación manual de `processPendingJobs`

**Acciones:**
1. Buscar jobs con `status = 'pending'`
2. Ordenar por `created_at` ASC
3. Tomar el primer job
4. Si no hay jobs, retornar éxito

**Query Supabase:**
```sql
SELECT * FROM file_processing_jobs
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1
```

**Logs esperados:**
```
[RAG Worker] Iniciando procesamiento...
[RAG Worker] Procesando job: [job-id]
```

**Puntos de fallo:**
- ❌ Error de conexión con Supabase
- ⚠️ No hay jobs pendientes (retorna éxito, no es error)

---

#### Paso 3.2: Marcar job como 'processing'
**Ubicación:** `functions/rag-worker/index.js`

**Acciones:**
1. Actualizar estado del job a `processing`
2. Actualizar `updated_at`

**Query Supabase:**
```sql
UPDATE file_processing_jobs
SET status = 'processing', updated_at = NOW()
WHERE id = [job-id]
```

**Logs esperados:**
```
[RAG Worker] Job marcado como processing
```

**Puntos de fallo:**
- ❌ Error actualizando estado (poco probable)

---

#### Paso 3.3: Descargar archivo PDF
**Ubicación:** `functions/rag-worker/index.js`

**Acciones:**
1. Determinar fuente (Google Drive o Supabase Storage)
2. Si es Google Drive:
   - Obtener token del usuario desde `user_google_tokens`
   - Descargar archivo con `axios.get`
   - Timeout: 30 minutos
3. Si es Supabase Storage:
   - Descargar desde bucket `course-documents`
   - Timeout: 30 minutos
4. Validar tamaño del archivo (máx 900MB)

**Logs esperados:**
```
[RAG Worker] Iniciando descarga del archivo...
[RAG Worker] Descargando desde Google Drive (ID: [file-id])...
[RAG Worker] PDF descargado: [bytes] bytes ([MB] MB)
```

**Puntos de fallo:**
- ❌ Token de Google Drive no encontrado o expirado
- ❌ Archivo no encontrado en Google Drive
- ❌ Timeout en descarga (archivo muy grande o conexión lenta)
- ❌ Archivo demasiado grande (>900MB)
- ❌ Error de conexión con Google Drive API

---

#### Paso 3.4: Validar formato PDF
**Ubicación:** `functions/rag-worker/index.js`

**Acciones:**
1. Leer primeros 4 bytes del buffer
2. Verificar que sea `%PDF`
3. Si no es PDF válido, lanzar error

**Logs esperados:**
```
[RAG Worker] Validando formato PDF...
```

**Puntos de fallo:**
- ❌ Archivo no es PDF válido (corrupto o formato incorrecto)

---

#### Paso 3.5: Extraer texto del PDF
**Ubicación:** `functions/rag-worker/index.js`

**Acciones:**
1. Usar `pdf-parse` para extraer texto
2. Timeout: 10 minutos
3. Obtener número de páginas y texto completo

**Logs esperados:**
```
[RAG Worker] Extrayendo texto del PDF (esto puede tardar varios minutos para archivos grandes de [MB]MB)...
[RAG Worker] Texto extraído: [length] caracteres de [pages] páginas
```

**Puntos de fallo:**
- ❌ PDF corrupto o inválido (`InvalidPDFException`)
- ❌ Timeout en extracción (archivo muy grande o complejo)
- ❌ Error de memoria (archivo demasiado grande)
- ❌ No se pudo extraer texto (PDF escaneado sin OCR)

---

#### Paso 3.6: Dividir texto en chunks
**Ubicación:** `functions/rag-worker/index.js`

**Acciones:**
1. Dividir texto en chunks de tamaño configurado (default: 60 caracteres)
2. Crear metadata para cada chunk
3. Calcular número total de chunks

**Logs esperados:**
```
[RAG Worker] Dividiendo texto en chunks...
[RAG Worker] Total de chunks creados: [count]
```

**Puntos de fallo:**
- ❌ Texto vacío (no se pudo extraer texto)
- ❌ Error procesando chunks (poco probable)

---

#### Paso 3.7: Generar embeddings en batch
**Ubicación:** `functions/rag-worker/index.js`

**Acciones:**
1. Procesar chunks en batches de 20
2. Generar embeddings con Google Generative AI (`text-embedding-004`)
3. Actualizar progreso cada 25 chunks
4. Guardar embeddings en `rag_file_chunks` en Supabase

**Logs esperados:**
```
[RAG Worker] Generando embeddings para [total] chunks...
[RAG Worker] Procesando batch [batch-number] de [total-batches]...
[RAG Worker] [processed]/[total] chunks procesados ([percentage]%)
```

**Puntos de fallo:**
- ❌ Error de API de Google Generative AI
- ❌ Quota excedido en Google Generative AI
- ❌ Timeout en inserción a Supabase (demasiados chunks)
- ❌ Error de conexión con Supabase
- ❌ Error de memoria (demasiados chunks en memoria)

---

#### Paso 3.8: Actualizar estado a 'completed'
**Ubicación:** `functions/rag-worker/index.js`

**Acciones:**
1. Actualizar job a `status = 'completed'`
2. Guardar `completed_at`
3. Actualizar `rag_status` del material a `'completed'`
4. Retornar éxito

**Query Supabase:**
```sql
UPDATE file_processing_jobs
SET status = 'completed', 
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = [job-id]

UPDATE materials
SET rag_status = 'completed'
WHERE id = [material-id]
```

**Logs esperados:**
```
[RAG Worker] ✅ Procesamiento completado exitosamente
[RAG Worker] Total de chunks procesados: [count]
```

**Puntos de fallo:**
- ❌ Error actualizando estado (poco probable)

---

### **FASE 4: Actualización en Frontend**

#### Paso 4.1: Suscripción a cambios en tiempo real
**Ubicación:** `src/services/firestoreService.ts` - función `subscribeToAllJobs`

**Acciones:**
1. Suscribirse a cambios en `file_processing_jobs`
2. Filtrar por `user_id`
3. Actualizar estado de jobs en tiempo real

**Logs esperados:**
```
[FirestoreService] Suscribiéndose a jobs para usuario: [user-id]
[FirestoreService] Estado de suscripción: SUBSCRIBED
[FirestoreService] Jobs encontrados: [count]
[FileProcessing] Jobs actualizados: [count] jobs
```

**Puntos de fallo:**
- ❌ Error de conexión con Supabase
- ⚠️ Suscripción no funciona (fallback a polling manual)

---

#### Paso 4.2: Actualización de UI
**Ubicación:** `src/pages/FileProcessingPage.tsx`

**Acciones:**
1. Recibir actualización de job desde suscripción
2. Actualizar estado del job en la UI
3. Mostrar progreso actualizado
4. Mostrar mensaje de completado cuando `status = 'completed'`

**Logs esperados:**
```
[FileProcessing] Jobs actualizados: [count] jobs
[FileProcessing] 📄 Archivo [nombre]: {status: 'processing', ...}
[FileProcessing] 🎯 Renderizando tarjeta de procesamiento para [nombre]
```

**Puntos de fallo:**
- ⚠️ UI no se actualiza (problema de React, no crítico)

---

## 🐛 Manejo de Errores

### Si el job falla en cualquier paso:

**Ubicación:** `functions/rag-worker/index.js` - bloque `catch`

**Acciones:**
1. Capturar error
2. Determinar tipo de error (timeout, memoria, conexión, etc.)
3. Crear mensaje de error descriptivo
4. Actualizar job a `status = 'failed'`
5. Guardar `error_message`
6. Actualizar `rag_status` del material a `'failed'`

**Query Supabase:**
```sql
UPDATE file_processing_jobs
SET status = 'failed',
    error_message = '[mensaje de error]',
    updated_at = NOW()
WHERE id = [job-id]

UPDATE materials
SET rag_status = 'failed'
WHERE id = [material-id]
```

**Logs esperados:**
```
[RAG Worker] Error: [mensaje de error]
[RAG Worker] Stack: [stack trace]
[RAG Worker] ❌ Job marcado como fallido
```

---

## 📊 Puntos de Verificación

### Verificar que el flujo funciona:

1. **Frontend:**
   - ✅ Logs en consola del navegador
   - ✅ Job aparece en la lista después de crear
   - ✅ Estado cambia de `pending` → `processing` → `completed`

2. **createFileProcessingJob:**
   - ✅ Logs en Google Cloud Console > Cloud Functions > createFileProcessingJob
   - ✅ Job creado en Supabase
   - ✅ RAG worker invocado exitosamente

3. **RAG Worker:**
   - ✅ Logs en Google Cloud Console > Cloud Run > rag-worker
   - ✅ Job cambia a `processing`
   - ✅ Progreso de chunks visible en logs
   - ✅ Job cambia a `completed`

4. **Supabase:**
   - ✅ Job en tabla `file_processing_jobs`
   - ✅ Chunks en tabla `rag_file_chunks`
   - ✅ Material actualizado con `rag_status`

---

## 🔍 Diagnóstico de Problemas

### Job queda en `pending`:

1. **Verificar invocación del rag-worker:**
   ```bash
   # Ver logs de createFileProcessingJob
   gcloud functions logs read createFileProcessingJob --limit 50
   
   # Buscar:
   # ✅ RAG worker invocado exitosamente
   # ⚠️ Error invocando RAG worker
   ```

2. **Verificar que el rag-worker esté funcionando:**
   ```bash
   # Invocar manualmente
   curl -X POST https://rag-worker-mcc5aevj6a-uc.a.run.app
   ```

3. **Verificar jobs pendientes en Supabase:**
   ```sql
   SELECT id, file_name, status, created_at, updated_at
   FROM file_processing_jobs
   WHERE status = 'pending'
   ORDER BY created_at ASC;
   ```

### Job queda en `processing`:

1. **Verificar logs del rag-worker:**
   ```bash
   # Ver logs en Cloud Run
   gcloud run services logs read rag-worker --limit 100
   ```

2. **Verificar en qué paso está:**
   - Buscar logs de descarga, extracción, chunks, embeddings
   - Ver si hay errores o timeouts

3. **Verificar si está "stuck" (más de 2 horas):**
   ```sql
   SELECT id, file_name, status, created_at, updated_at,
          EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_since_update
   FROM file_processing_jobs
   WHERE status = 'processing'
     AND updated_at < NOW() - INTERVAL '2 hours';
   ```

### Job falla (`failed`):

1. **Ver mensaje de error:**
   ```sql
   SELECT id, file_name, status, error_message
   FROM file_processing_jobs
   WHERE status = 'failed'
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

2. **Ver logs del rag-worker:**
   - Buscar el error específico en los logs
   - Ver stack trace completo

---

## 🚀 Mejoras de Transparencia Implementadas

### 1. Logging Detallado en Cada Paso

Cada paso del proceso ahora tiene logs específicos con prefijos:
- `[FileProcessing]` - Frontend
- `[createFileProcessingJob]` - Creación de job
- `[RAG Worker]` - Procesamiento

### 2. Retry Automático

- `createFileProcessingJob` ahora intenta invocar rag-worker 3 veces con exponential backoff
- Logs detallados de cada intento

### 3. Función de Procesamiento Manual

- `processPendingJobs` permite procesar jobs pendientes manualmente
- Útil para diagnóstico y emergencias

### 4. Cloud Scheduler (Recomendado)

- Procesa jobs pendientes automáticamente cada 2 minutos
- Asegura que los jobs se procesen eventualmente

---

## 📝 Próximas Mejoras Sugeridas

1. **Dashboard de Monitoreo:**
   - Ver todos los jobs en tiempo real
   - Métricas de procesamiento
   - Alertas para jobs atascados

2. **Notificaciones:**
   - Notificar cuando un job completa
   - Notificar cuando un job falla

3. **Reintento Automático:**
   - Reintentar jobs fallidos automáticamente
   - Configurar número máximo de reintentos

4. **Métricas Detalladas:**
   - Tiempo promedio de procesamiento
   - Tasa de éxito/fallo
   - Tiempo por etapa

---

**Última actualización:** Noviembre 2025

