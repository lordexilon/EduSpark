-- Script para verificar la vinculación de materiales procesados con el Tutor AI
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estructura de course_content_chunks
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
ORDER BY ordinal_position;

-- 2. Verificar chunks existentes y su course_id
SELECT 
  COUNT(*) as total_chunks,
  COUNT(DISTINCT course_id) as cursos_con_chunks,
  MIN(course_id) as min_course_id,
  MAX(course_id) as max_course_id,
  COUNT(CASE WHEN course_id IS NULL THEN 1 END) as chunks_sin_course_id
FROM course_content_chunks;

-- 3. Verificar chunks por curso (primeros 10 cursos)
SELECT 
  course_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT metadata->>'material_id') as materiales_unicos,
  MIN(created_at) as primer_chunk,
  MAX(created_at) as ultimo_chunk
FROM course_content_chunks
GROUP BY course_id
ORDER BY total_chunks DESC
LIMIT 10;

-- 4. Verificar materiales procesados y su relación con chunks
SELECT 
  m.id as material_id,
  m.title as material_title,
  m.course_id as material_course_id,
  m.rag_status,
  m.metadata->>'sourceFileId' as source_file_id,
  COUNT(ccc.id) as chunks_asociados
FROM materials m
LEFT JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
  OR ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId'
WHERE m.rag_status IN ('completed', 'processing')
GROUP BY m.id, m.title, m.course_id, m.rag_status, m.metadata->>'sourceFileId'
ORDER BY chunks_asociados DESC, m.created_at DESC
LIMIT 20;

-- 5. Verificar si hay chunks sin material_id en metadata
SELECT 
  COUNT(*) as chunks_sin_material_id,
  COUNT(DISTINCT course_id) as cursos_afectados
FROM course_content_chunks
WHERE metadata->>'material_id' IS NULL
  AND metadata->>'sourceFileId' IS NULL;

-- 6. Verificar chunks por material_id específico (reemplazar 'MATERIAL_ID_AQUI' con un ID real)
-- SELECT 
--   ccc.id,
--   ccc.course_id,
--   ccc.chunk_index,
--   ccc.metadata->>'material_id' as material_id_metadata,
--   ccc.metadata->>'sourceFileId' as source_file_id_metadata,
--   LEFT(ccc.content, 100) as content_preview,
--   ccc.created_at
-- FROM course_content_chunks ccc
-- WHERE ccc.metadata->>'material_id' = 'MATERIAL_ID_AQUI'
--    OR ccc.metadata->>'sourceFileId' = 'MATERIAL_ID_AQUI'
-- ORDER BY ccc.chunk_index;

-- 7. Verificar si hay discrepancias entre course_id del material y course_id del chunk
SELECT 
  m.id as material_id,
  m.title,
  m.course_id as material_course_id,
  ccc.course_id as chunk_course_id,
  COUNT(ccc.id) as chunks_count,
  CASE 
    WHEN m.course_id != ccc.course_id THEN 'DISCREPANCIA'
    ELSE 'OK'
  END as estado
FROM materials m
INNER JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.title, m.course_id, ccc.course_id
HAVING m.course_id != ccc.course_id
LIMIT 20;

-- 8. Resumen de vinculación
SELECT 
  'Total de materiales procesados' as metrica,
  COUNT(*)::text as valor
FROM materials
WHERE rag_status = 'completed'
UNION ALL
SELECT 
  'Total de chunks en base de datos',
  COUNT(*)::text
FROM course_content_chunks
UNION ALL
SELECT 
  'Materiales con chunks asociados',
  COUNT(DISTINCT ccc.metadata->>'material_id')::text
FROM course_content_chunks ccc
WHERE ccc.metadata->>'material_id' IS NOT NULL
UNION ALL
SELECT 
  'Cursos con chunks disponibles',
  COUNT(DISTINCT course_id)::text
FROM course_content_chunks;

