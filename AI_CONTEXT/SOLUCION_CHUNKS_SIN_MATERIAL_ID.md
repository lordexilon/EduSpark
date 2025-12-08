# Solución: Chunks sin material_id en metadata

## Problema Identificado

Los libros procesados muestran "0" chunks en la página de materiales, aunque el procesamiento se completó exitosamente. Esto ocurre porque:

1. **Chunks antiguos**: Los jobs procesados antes de la corrección del rag-worker pueden tener chunks guardados sin `material_id` en metadata
2. **Búsqueda en frontend**: La página de materiales busca `chunk.metadata?.material_id`, pero si es `undefined`, no cuenta esos chunks

## Solución Implementada

### 1. Corrección en rag-worker ✅

El rag-worker ahora usa la variable `materialId` normalizada directamente al guardar chunks:

```javascript
metadata: {
    material_id: materialId, // Usa la variable materialId normalizada
    page_start: ...,
    page_end: ...,
    file_name: job.file_name,
    chunk_size: chunkSize
}
```

**Ubicación**: `functions/rag-worker/index.js` línea 541

### 2. Script de Migración

Se creó un script SQL para migrar chunks antiguos sin `material_id`:

**Archivo**: `sql_scripts/migrar_chunks_sin_material_id.sql`

Este script:
- Identifica chunks sin `material_id`
- Los asocia con materiales basándose en `file_name` y `course_id`
- Actualiza el metadata de los chunks

## Pasos para Resolver el Problema

### Opción 1: Migrar Chunks Existentes (Recomendado)

1. **Ejecutar el script de migración** en Supabase SQL Editor:
   ```sql
   -- Ver el archivo: sql_scripts/migrar_chunks_sin_material_id.sql
   ```

2. **Verificar resultados**:
   - El script mostrará cuántos chunks se migraron
   - Verifica que los chunks ahora tengan `material_id`

3. **Refrescar la página de materiales**:
   - Los contadores deberían actualizarse automáticamente

### Opción 2: Reprocesar Materiales Afectados

Si la migración no funciona o prefieres reprocesar:

1. **Identificar materiales afectados**:
   ```sql
   SELECT DISTINCT
       m.id,
       m.title,
       m.metadata->>'file_name' as file_name
   FROM materials m
   WHERE NOT EXISTS (
       SELECT 1 FROM course_content_chunks ccc
       WHERE ccc.metadata->>'material_id' = m.id::text
   )
   AND m.metadata->>'rag_status' = 'completed';
   ```

2. **Reprocesar desde el frontend**:
   - Ve a `/file-processing`
   - Encuentra el archivo afectado
   - Haz clic en "Procesar" nuevamente

## Verificación

### Verificar Chunks por Material

```sql
-- Contar chunks por material
SELECT 
    m.id as material_id,
    m.title,
    COUNT(ccc.id) as chunks_count
FROM materials m
LEFT JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
GROUP BY m.id, m.title
ORDER BY chunks_count DESC;
```

### Verificar Chunks Específicos de un Material

```sql
-- Para "Williams Obstetricia 25a Edicion.pdf"
SELECT 
    ccc.id,
    ccc.metadata->>'file_name' as file_name,
    ccc.metadata->>'material_id' as material_id,
    ccc.chunk_index,
    LEFT(ccc.content, 100) as content_preview
FROM course_content_chunks ccc
WHERE ccc.metadata->>'file_name' LIKE '%Williams Obstetricia%'
ORDER BY ccc.chunk_index;
```

## Prevención Futura

Con la corrección aplicada, todos los nuevos chunks se guardarán con `material_id` correctamente. El problema solo afecta a chunks procesados antes de esta corrección.

## Notas Técnicas

- **Variable `materialId`**: Se normaliza al inicio del procesamiento (línea 67 del rag-worker)
- **Fallback**: Si no está en `job.metadata.materialId`, se usa `job.material_id`
- **Validación**: El código valida que `materialId` exista antes de continuar
- **Logging**: Los logs muestran qué `materialId` se está usando

## Próximos Pasos

1. ✅ Corrección aplicada en rag-worker
2. ⏳ Ejecutar script de migración para chunks antiguos
3. ⏳ Verificar que los contadores se actualicen
4. ⏳ Reprocesar materiales si es necesario

