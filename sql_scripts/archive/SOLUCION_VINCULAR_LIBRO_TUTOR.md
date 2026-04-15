# Solución: Vincular Libro Procesado con Tutor AI

## Problema
El libro fue procesado exitosamente, pero no está disponible en el Tutor AI. Los chunks se guardaron en `course_content_chunks`, pero el tutor no los encuentra.

## Diagnóstico

### Paso 1: Ejecutar Script de Verificación
Ejecuta el script `verificar_vinculacion_tutor.sql` en Supabase SQL Editor para diagnosticar el problema.

### Posibles Causas

1. **course_id incorrecto o NULL en los chunks**
   - Los chunks se guardaron sin `course_id` o con un `course_id` incorrecto
   - Solución: Verificar y corregir el `course_id` en los chunks

2. **Discrepancia entre course_id del material y course_id del chunk**
   - El material tiene un `course_id` diferente al de los chunks
   - Solución: Actualizar los chunks para que coincidan con el material

3. **material_id no está en metadata de los chunks**
   - Los chunks no tienen `material_id` en su metadata
   - Solución: Agregar `material_id` a la metadata de los chunks

4. **Tipo de dato incorrecto**
   - El `course_id` está como string en lugar de INTEGER
   - Solución: Convertir a INTEGER

## Soluciones

### Solución 1: Corregir course_id en chunks existentes

Si los chunks tienen un `course_id` incorrecto o NULL, ejecuta:

```sql
-- Reemplazar MATERIAL_ID y COURSE_ID con los valores correctos
UPDATE course_content_chunks
SET course_id = COURSE_ID_INTEGER
WHERE metadata->>'material_id' = 'MATERIAL_ID'
   OR metadata->>'sourceFileId' = 'FILE_ID_DE_GOOGLE_DRIVE';
```

### Solución 2: Agregar material_id a chunks que no lo tienen

Si los chunks no tienen `material_id` en metadata:

```sql
-- Primero, identificar el material_id correcto
SELECT 
  m.id as material_id,
  m.course_id,
  m.metadata->>'sourceFileId' as source_file_id,
  COUNT(ccc.id) as chunks_count
FROM materials m
LEFT JOIN course_content_chunks ccc 
  ON ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId'
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.course_id, m.metadata->>'sourceFileId';

-- Luego, actualizar los chunks
UPDATE course_content_chunks ccc
SET 
  course_id = m.course_id,
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{material_id}',
    to_jsonb(m.id::text)
  )
FROM materials m
WHERE (ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId'
   OR ccc.metadata->>'sourceFileId' IS NULL)
  AND m.rag_status = 'completed'
  AND ccc.metadata->>'material_id' IS NULL;
```

### Solución 3: Verificar que el tutor busca correctamente

El tutor AI busca chunks usando:
- `course_id` como INTEGER
- Filtro: `.eq('course_id', courseIdInt)`

Verifica que el `courseId` que pasas al tutor sea el mismo que el `course_id` en los chunks.

## Verificación Final

Después de aplicar las soluciones, verifica:

```sql
-- Verificar chunks por curso
SELECT 
  course_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT metadata->>'material_id') as materiales
FROM course_content_chunks
WHERE course_id = TU_COURSE_ID
GROUP BY course_id;

-- Verificar que el material tiene chunks
SELECT 
  m.id,
  m.title,
  m.course_id,
  COUNT(ccc.id) as chunks_count
FROM materials m
LEFT JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
WHERE m.id = 'TU_MATERIAL_ID'
GROUP BY m.id, m.title, m.course_id;
```

## Próximos Pasos

1. Ejecuta el script de verificación
2. Identifica el problema específico
3. Aplica la solución correspondiente
4. Verifica que el tutor ahora encuentra los chunks

