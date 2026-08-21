# 🔍 DIAGNÓSTICO: sourceFileName Faltante en Chunks

**Fecha**: 2026-01-12  
**Problema**: Los chunks se están creando correctamente pero `sourceFileName` está NULL en metadata.

## 📊 **HALLAZGOS**

1. ✅ **Job "split" completado**: Williams Gineco.pdf se procesó correctamente
2. ✅ **Chunks creados**: Se crearon chunks con `material_id` correcto (`0c4aefc6-4e81-402c-a4a7-8506d2296ab5`)
3. ✅ **Páginas correctas**: Los chunks tienen páginas válidas (1351-1409)
4. ❌ **sourceFileName NULL**: Todos los chunks tienen `metadata->>'sourceFileName'` = NULL

## 🔍 **ANÁLISIS DEL CÓDIGO**

### **Flujo Esperado:**

1. `processSplitJob` crea child jobs con `sourceFileName: job.sourceFileName` ✅
2. `processChunkJob` recibe `job.sourceFileName` y lo pasa a `processTextIntoChunks` ✅
3. `processTextIntoChunks` incluye `sourceFileName` en `chunk.metadata` ✅
4. `saveChunksBatch` guarda `chunk.metadata` completo (debería incluir `sourceFileName`) ✅

### **Problema Identificado:**

El código **debería** funcionar, pero los chunks NO tienen `sourceFileName`. Esto sugiere que:

1. **Posibilidad 1**: `job.sourceFileName` es `undefined` cuando se procesan los child jobs
2. **Posibilidad 2**: El metadata se está perdiendo en algún punto del flujo

## 🔧 **SOLUCIONES APLICADAS**

### **1. Validaciones Añadidas al Worker** (`src/workers/file-processing-worker/worker.ts`):

- ✅ Validación de que `job.sourceFileName` existe antes de procesar
- ✅ Logs adicionales para debuggear
- ✅ Verificación de que `sourceFileName` está en los records antes de guardar

### **2. Solución Temporal (SQL):**

```sql
-- Asignar sourceFileName a chunks existentes
UPDATE course_content_chunks
SET metadata = jsonb_set(
    metadata, 
    '{sourceFileName}', 
    '"Williams Gineco.pdf"'
)
WHERE course_id = 12
  AND metadata->>'sourceFileName' IS NULL
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';
```

## 📋 **PRÓXIMOS PASOS**

1. ✅ Aplicar solución temporal (UPDATE SQL) para chunks existentes
2. ⏳ Verificar logs del worker para entender por qué `sourceFileName` no llega
3. ⏳ Revisar cómo se guardan los child jobs en `createChildJobs` para asegurar que `file_name` se guarda correctamente
4. ⏳ Probar con un nuevo procesamiento después de las correcciones

## 📝 **NOTAS**

- Los chunks **SÍ** tienen `material_id` correcto, por lo que el vínculo con el material está funcionando
- El problema es específico con `sourceFileName`, que no se está guardando en metadata
- El código del worker sugiere que debería funcionar, pero algo está fallando en el flujo
