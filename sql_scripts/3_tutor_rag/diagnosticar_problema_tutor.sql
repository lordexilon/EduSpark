-- Diagnóstico específico del problema de vinculación con Tutor AI
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar course_id en chunks vs course_id en materials
SELECT 
  'Discrepancia course_id' as tipo_problema,
  m.id as material_id,
  m.title as material_title,
  m.course_id as material_course_id,
  ccc.course_id as chunk_course_id,
  COUNT(ccc.id) as chunks_count,
  CASE 
    WHEN m.course_id != ccc.course_id THEN '❌ DISCREPANCIA'
    WHEN ccc.course_id IS NULL THEN '❌ NULL en chunks'
    ELSE '✅ OK'
  END as estado
FROM materials m
INNER JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.title, m.course_id, ccc.course_id
ORDER BY estado DESC, chunks_count DESC;

-- 2. Verificar tipo de dato de course_id en chunks
SELECT 
  course_id,
  pg_typeof(course_id) as tipo_dato,
  COUNT(*) as cantidad_chunks
FROM course_content_chunks
GROUP BY course_id, pg_typeof(course_id);

-- 3. Verificar chunks por curso específico (mostrar todos los cursos)
SELECT 
  ccc.course_id,
  c.id as course_exists,
  c.title as course_title,
  COUNT(DISTINCT ccc.metadata->>'material_id') as materiales_unicos,
  COUNT(ccc.id) as total_chunks
FROM course_content_chunks ccc
LEFT JOIN courses c ON c.id = ccc.course_id
GROUP BY ccc.course_id, c.id, c.title
ORDER BY total_chunks DESC;

-- 4. Verificar si los chunks tienen material_id en metadata
SELECT 
  CASE 
    WHEN metadata->>'material_id' IS NOT NULL THEN '✅ Tiene material_id'
    WHEN metadata->>'sourceFileId' IS NOT NULL THEN '⚠️ Solo sourceFileId'
    ELSE '❌ Sin material_id ni sourceFileId'
  END as estado_metadata,
  COUNT(*) as cantidad_chunks,
  COUNT(DISTINCT course_id) as cursos_afectados
FROM course_content_chunks
GROUP BY 
  CASE 
    WHEN metadata->>'material_id' IS NOT NULL THEN '✅ Tiene material_id'
    WHEN metadata->>'sourceFileId' IS NOT NULL THEN '⚠️ Solo sourceFileId'
    ELSE '❌ Sin material_id ni sourceFileId'
  END;

-- 5. Detalle completo de materiales y sus chunks
SELECT 
  m.id as material_id,
  m.title,
  m.course_id as material_course_id,
  m.rag_status,
  m.metadata->>'sourceFileId' as source_file_id,
  COUNT(ccc.id) as chunks_count,
  MIN(ccc.course_id) as min_chunk_course_id,
  MAX(ccc.course_id) as max_chunk_course_id,
  COUNT(DISTINCT ccc.course_id) as cursos_diferentes_en_chunks,
  STRING_AGG(DISTINCT ccc.metadata->>'material_id', ', ') as material_ids_en_chunks
FROM materials m
LEFT JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
  OR ccc.metadata->>'sourceFileId' = m.metadata->>'sourceFileId'
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.title, m.course_id, m.rag_status, m.metadata->>'sourceFileId'
ORDER BY chunks_count DESC;

-- 6. Verificar si el tutor puede encontrar los chunks (simular búsqueda)
-- Reemplazar [COURSE_ID] con el ID del curso que estás usando en el tutor
SELECT 
  '[COURSE_ID]' as course_id_buscado,
  COUNT(*) as chunks_encontrados,
  COUNT(DISTINCT metadata->>'material_id') as materiales_encontrados
FROM course_content_chunks
WHERE course_id = [COURSE_ID];  -- Reemplazar con el course_id que usa el tutor

-- 7. Listar todos los course_id únicos en chunks para comparar
SELECT DISTINCT 
  course_id,
  COUNT(*) as chunks_count
FROM course_content_chunks
GROUP BY course_id
ORDER BY course_id;

