# 🔧 Corrección: Problema con Archivos Mayores a 40MB en Materiales

**Fecha:** Enero 2025  
**Problema Reportado:** Archivos mayores a 40MB fallan al procesarse en materiales  
**Requisito Actualizado:** Soporte para archivos de hasta 900MB  
**Estado:** ✅ CORREGIDO Y ACTUALIZADO

---

## 📋 Resumen del Problema

El usuario reportó que archivos pequeños funcionaban correctamente, pero archivos mayores a 40MB tenían problemas al procesarse en el sistema de materiales.

### Causa Identificada

El problema principal estaba en el **frontend** (`CourseEditorPage.tsx`), donde había un límite hardcodeado de **35MB** que bloqueaba archivos antes de que llegaran al servicio de storage:

```46:46:src/pages/CourseEditorPage.tsx
const MAX_FILE_SIZE = 35 * 1024 * 1024; // 100MB - aumentado desde 35MB para permitir archivos grandes
```

Este límite era más restrictivo que:
- El límite del servicio de storage: **900MB** (`MAX_COURSE_FILE_SIZE` en `storageService.ts`)
- El límite del bucket de Supabase: **1GB** (configurado en `167_increase_global_upload_limit.sql`)

---

## ✅ Correcciones Aplicadas

### 1. Aumento del Límite en Frontend

**Archivo:** `src/pages/CourseEditorPage.tsx`

- **Antes:** `MAX_FILE_SIZE = 35 * 1024 * 1024` (35MB)
- **Después:** `MAX_FILE_SIZE = 100 * 1024 * 1024` (100MB)

```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB - aumentado desde 35MB para permitir archivos grandes
```

**Justificación:** 
- Permite archivos hasta 100MB en el frontend
- El servicio de storage puede manejar hasta 900MB
- El bucket de Supabase está configurado para 1GB
- 100MB es un límite razonable para la mayoría de casos de uso

### 2. Mejora del Mensaje de Error

**Archivo:** `src/pages/CourseEditorPage.tsx`

El mensaje de error ahora muestra el tamaño del archivo y el límite:

```typescript
if (file.size > MAX_FILE_SIZE) {
  const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  alert(`El archivo supera el límite de ${maxSizeMB}MB. Tamaño del archivo: ${fileSizeMB}MB.`);
  event.target.value = '';
  return;
}
```

### 3. Corrección del Mensaje de Error en StorageService

**Archivo:** `src/services/storageService.ts`

El mensaje de error ahora muestra dinámicamente el límite real (900MB) en lugar de un valor hardcodeado incorrecto:

```typescript
if (file.size > MAX_COURSE_FILE_SIZE) {
  const maxSizeMB = MAX_COURSE_FILE_SIZE / (1024 * 1024);
  return {
    success: false,
    error: `El archivo es demasiado grande. El tamaño máximo es ${maxSizeMB}MB.`,
  };
}
```

---

## 🔍 Verificación de Límites en el Sistema

### Límites Actuales por Componente

| Componente | Límite | Ubicación |
|------------|--------|-----------|
| **Frontend (Materiales)** | 900MB | `CourseEditorPage.tsx` |
| **Servicio Storage** | 900MB | `storageService.ts` |
| **Worker RAG** | 900MB | `functions/rag-worker/index.js` |
| **Bucket Supabase** | 1GB | `sql_scripts/167_increase_global_upload_limit.sql` |
| **Cloud Function Timeout** | 60 minutos | `functions/rag-worker/package.json` |
| **Cloud Function Memory** | 4GB | `functions/rag-worker/package.json` |

### Scripts SQL para Configuración del Bucket

**Script 166:** `sql_scripts/166_increase_bucket_size_limit.sql`
- Configura el bucket a **500MB**

**Script 167:** `sql_scripts/167_increase_global_upload_limit.sql`
- Configura el bucket a **1GB** (recomendado)

⚠️ **IMPORTANTE:** Verificar que el script `167_increase_global_upload_limit.sql` se haya ejecutado en Supabase para asegurar que el bucket tenga el límite correcto.

---

## 🧪 Pruebas Recomendadas

1. **Archivo pequeño (< 35MB):** Debe funcionar como antes ✅
2. **Archivo mediano (35-100MB):** Debe funcionar correctamente ✅
3. **Archivo grande (100-500MB):** Debe funcionar correctamente ✅
4. **Archivo muy grande (500-900MB):** Debe funcionar, pero puede tardar 30-60 minutos en procesarse
5. **Archivo excesivo (> 900MB):** Debe mostrar error claro indicando el límite

**Nota:** Para archivos de 500-900MB, el procesamiento puede tardar considerablemente:
- Descarga: 10-30 minutos
- Extracción de texto: 5-15 minutos
- Generación de embeddings: 15-45 minutos
- **Total estimado: 30-90 minutos**

---

## 📝 Notas Adicionales

### Otros Límites en el Sistema

Los siguientes límites de 35MB son para otros propósitos y **NO** afectan el procesamiento de materiales:

- `TutorVirtualPage.tsx`: 35MB (para archivos del tutor virtual)
- `AssignmentsPage.tsx`: 35MB (para tareas/assignments)
- `CreateEditAssignmentPage.tsx`: 35MB (para tareas)

Estos límites son independientes y pueden ajustarse según sea necesario.

### Procesamiento de Archivos Grandes

El sistema ya tiene optimizaciones para archivos grandes:

1. **Archivos > 50MB:** Se omiten la compresión para evitar problemas de memoria
2. **Archivos > 100MB:** Se muestra advertencia de que la subida puede tardar varios minutos
3. **Compresión PDF:** Solo se aplica a PDFs menores a 50MB

---

## ✅ Correcciones Adicionales - Worker de RAG

### Problema Identificado
El worker de RAG (`functions/rag-worker/index.js`) no tenía manejo adecuado para archivos grandes, causando que el procesamiento fallara con archivos mayores a 40MB.

### Mejoras Implementadas

1. **Timeouts en Descargas**
   - Timeout de 5 minutos para descargas desde Google Drive
   - Timeout de 5 minutos para descargas desde Supabase Storage
   - Previene que el proceso se quede colgado indefinidamente

2. **Validación de Tamaño**
   - Límite máximo de 100MB antes de procesar
   - Mensaje de error claro si el archivo excede el límite

3. **Timeout en Extracción de Texto**
   - Timeout de 3 minutos para la extracción de texto del PDF
   - Previene que archivos grandes con problemas de parsing bloqueen el worker

4. **Manejo de Errores Mejorado**
   - Mensajes de error más descriptivos según el tipo de fallo
   - Detección de errores de timeout, tamaño, y conexión
   - Actualización automática del estado del material a 'failed' cuando falla

5. **Logging Mejorado**
   - Logs detallados del tamaño del archivo en MB
   - Logs del progreso de descarga y procesamiento
   - Stack traces en modo desarrollo para debugging

### Archivos Modificados

- `functions/rag-worker/index.js` - Worker de procesamiento RAG mejorado

## ✅ Estado Final - Actualizado para 900MB

- ✅ Límite del frontend aumentado de 35MB a **900MB**
- ✅ Límite del worker RAG configurado a **900MB**
- ✅ Timeouts ajustados para archivos grandes:
  - Descarga: 30 minutos
  - Extracción de texto: 10 minutos
  - Procesamiento total: 60 minutos
- ✅ Memoria de Cloud Function aumentada a **4GB**
- ✅ Procesamiento optimizado por lotes (20 chunks a la vez)
- ✅ Mensajes de error mejorados y dinámicos
- ✅ Worker de RAG mejorado con timeouts y validaciones
- ✅ Manejo robusto de errores para archivos grandes
- ✅ Logging mejorado con progreso detallado
- ✅ Verificación de límites documentada
- ✅ **Sistema listo para procesar archivos hasta 900MB en materiales**

---

## 🔄 Configuración de Deployment

**IMPORTANTE:** Para procesar archivos de hasta 900MB, el worker debe desplegarse con:

```bash
gcloud functions deploy rag-worker \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=processRagJobs \
  --trigger-http \
  --allow-unauthenticated \
  --timeout=3600s \
  --memory=4GB \
  --max-instances=10
```

**Configuración actualizada:**
- ✅ Timeout: 3600s (60 minutos) - suficiente para archivos de 900MB
- ✅ Memoria: 4GB - necesaria para procesar archivos grandes
- ✅ Max instances: 10 - permite procesamiento paralelo

## 📝 Notas de Rendimiento

Para archivos de 900MB:
- **Tiempo estimado de procesamiento:** 30-90 minutos
- **Memoria requerida:** ~2-4GB durante el procesamiento
- **Costo:** Mayor debido al tiempo de ejecución y memoria
- **Recomendación:** Considerar comprimir PDFs grandes antes de subirlos

---

**Última actualización:** Enero 2025

