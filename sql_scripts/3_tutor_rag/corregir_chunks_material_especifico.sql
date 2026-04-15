-- Script para corregir chunks de un material específico
-- Reemplazar los valores marcados con [VALOR] antes de ejecutar

-- 1. Identificar el material y sus chunks
SELECT 
  m.id as material_id,
  m.title,
  m.course_id as material_course_id,
  m.rag_status,
  m.metadata->>'sourceFileId' as source_file_id,
  COUNT(ccc.id) as chunks_existentes,
  COUNT(CASE WHEN ccc.course_id = m.course_id THEN 1 END) as chunks_correctos,
  COUNT(CASE WHEN ccc.course_id != m.course_id OR ccc.course_id IS NULL THEN 1 END) as chunks_incorrectos
FROM materials m
LEFT JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
  OR ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId'
WHERE m.id = '[MATERIAL_ID_AQUI]'::uuid  -- Reemplazar con el ID del material
GROUP BY m.id, m.title, m.course_id, m.rag_status, m.metadata->>'sourceFileId';

-- 2. Ver chunks actuales del material
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.chunk_index,
  ccc.metadata->>'material_id' as material_id_metadata,
  ccc.metadata->>'sourceFileId' as source_file_id_metadata,
  LEFT(ccc.content, 100) as content_preview
FROM course_content_chunks ccc
WHERE ccc.metadata->>'material_id' = '[MATERIAL_ID_AQUI]'
   OR ccc.metadata->>'sourceFileId' = '[SOURCE_FILE_ID_AQUI]'  -- Si conoces el sourceFileId
ORDER BY ccc.chunk_index;

-- 3. CORRECCIÓN: Actualizar course_id y material_id en chunks
-- ⚠️ IMPORTANTE: Reemplazar [MATERIAL_ID_AQUI] y [COURSE_ID_AQUI] con los valores correctos
UPDATE course_content_chunks ccc
SET 
  course_id = [COURSE_ID_AQUI],  -- Reemplazar con el course_id correcto (INTEGER)
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{material_id}',
    to_jsonb('[MATERIAL_ID_AQUI]'::text)  -- Reemplazar con el material_id correcto
  )
WHERE ccc.metadata->>'material_id' = '[MATERIAL_ID_AQUI]'
   OR ccc.metadata->>'sourceFileId' = '[SOURCE_FILE_ID_AQUI]'  -- Opcional: si conoces el sourceFileId
   OR (ccc.metadata->>'material_id' IS NULL 
       AND ccc.metadata->>'sourceFileId' = '[SOURCE_FILE_ID_AQUI]');

-- 4. Verificar corrección
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id_metadata,
  CASE 
    WHEN ccc.course_id = [COURSE_ID_AQUI] THEN '✅ Correcto'
    ELSE '❌ Incorrecto'
  END as estado
FROM course_content_chunks ccc
WHERE ccc.metadata->>'material_id' = '[MATERIAL_ID_AQUI]'
   OR ccc.metadata->>'sourceFileId' = '[SOURCE_FILE_ID_AQUI]'
ORDER BY ccc.chunk_index;

-- 5. Resumen final
SELECT 
  'Chunks corregidos' as metrica,
  COUNT(*)::text as valor
FROM course_content_chunks
WHERE metadata->>'material_id' = '[MATERIAL_ID_AQUI]'
  AND course_id = [COURSE_ID_AQUI]
UNION ALL
SELECT 
  'Chunks totales del material',
  COUNT(*)::text
FROM course_content_chunks
WHERE metadata->>'material_id' = '[MATERIAL_ID_AQUI]'
   OR metadata->>'sourceFileId' = '[SOURCE_FILE_ID_AQUI]';

