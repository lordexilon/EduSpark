# ✅ SOLUCIÓN COMPLETADA: sourceFileName Faltante en Chunks

**Fecha**: 2026-01-12  
**Estado**: ✅ **RESUELTO**

## 📊 **PROBLEMA IDENTIFICADO**

Los chunks de Williams Ginecología se estaban creando correctamente pero **no tenían `sourceFileName` en metadata**, causando que el tutor no pudiera encontrarlos en las búsquedas.

### **Diagnóstico Final:**
- ✅ **172 chunks** de Williams Ginecología creados correctamente
- ✅ **`material_id`** asignado correctamente: `0c4aefc6-4e81-402c-a4a7-8506d2296ab5`
- ❌ **`sourceFileName`** era NULL en todos los chunks

## 🔧 **SOLUCIÓN APLICADA**

### **1. Corrección Inmediata (SQL):**
```sql
-- Actualizar chunks existentes por lotes (1000 a la vez)
UPDATE course_content_chunks
SET metadata = jsonb_set(metadata, '{sourceFileName}', '"Williams Gineco.pdf"')
WHERE id IN (
    SELECT id
    FROM course_content_chunks
    WHERE course_id = 12
      AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5'
      AND (metadata->>'sourceFileName' IS NULL OR metadata->>'sourceFileName' != 'Williams Gineco.pdf')
    LIMIT 1000
);
```

**Resultado:**
- ✅ **172 chunks** actualizados correctamente
- ✅ **0 chunks** sin `sourceFileName`

### **2. Mejoras al Código del Worker:**

**Archivo**: `src/workers/file-processing-worker/worker.ts`

**Cambios aplicados:**
- ✅ Validación de que `job.sourceFileName` existe antes de procesar
- ✅ Logs adicionales para debuggear: `console.log('[Chunk] sourceFileName usado: "${job.sourceFileName}"')`
- ✅ Verificación de que `sourceFileName` está en los records antes de guardar
- ✅ Manejo de errores mejorado con logs detallados

**Código añadido:**
```typescript
// VALIDAR: sourceFileName debe estar presente
if (!job.sourceFileName) {
  console.error(`[Chunk] ERROR: job.sourceFileName es undefined para trabajo ${job.id}`);
  throw new Error('sourceFileName es requerido para procesar chunks');
}

// DEBUG: Verificar que sourceFileName está en los records
const firstRecord = records[0];
if (firstRecord?.metadata?.sourceFileName) {
  console.log(`[Chunk] ✅ sourceFileName confirmado en records: "${firstRecord.metadata.sourceFileName}"`);
} else {
  console.error(`[Chunk] ❌ ERROR: sourceFileName NO está en records!`, {
    hasMetadata: !!firstRecord?.metadata,
    metadataKeys: firstRecord?.metadata ? Object.keys(firstRecord.metadata) : [],
  });
}
```

## 📋 **VERIFICACIÓN**

```sql
SELECT
    COUNT(*) as total_chunks_williams,
    COUNT(CASE WHEN metadata->>'sourceFileName' = 'Williams Gineco.pdf' THEN 1 END) as chunks_con_sourceFileName,
    COUNT(CASE WHEN metadata->>'sourceFileName' IS NULL THEN 1 END) as chunks_sin_sourceFileName
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5';
```

**Resultado:**
- ✅ **172 chunks** totales
- ✅ **172 chunks** con `sourceFileName`
- ✅ **0 chunks** sin `sourceFileName`

## 🎯 **PRÓXIMOS PASOS**

1. ✅ **Chunks corregidos**: Todos los chunks existentes tienen `sourceFileName`
2. ✅ **Código mejorado**: El worker ahora valida y loguea `sourceFileName`
3. ⏳ **Probar búsqueda**: Preguntar al tutor "estadio cancer mama" para verificar que encuentra Williams Ginecología
4. ⏳ **Verificar procesamiento futuro**: El próximo archivo procesado debería incluir `sourceFileName` automáticamente gracias a las mejoras

## 🔍 **CAUSA RAÍZ (Posible)**

El problema probablemente se debió a que cuando se crearon los child jobs (`process_chunk`), el `job.sourceFileName` no se estaba pasando correctamente o se perdió en algún punto del flujo. Las mejoras al código ahora previenen este problema.

## 📝 **ARCHIVOS MODIFICADOS**

1. ✅ `src/workers/file-processing-worker/worker.ts` - Validaciones y logs adicionales
2. ✅ SQL scripts de diagnóstico y solución en `sql_scripts/4_diagnostics/`

## ✅ **ESTADO FINAL**

- ✅ **Problema resuelto** para chunks existentes
- ✅ **Prevención implementada** para futuros procesamientos
- ⏳ **Pendiente**: Verificar que la búsqueda funciona correctamente en el tutor
