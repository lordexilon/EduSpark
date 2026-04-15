-- Verificar que el tutor AI puede encontrar los chunks
-- Ejecutar en Supabase SQL Editor
-- Versión 2: Sin placeholders, muestra todos los course_ids disponibles

-- 1. Ver qué course_id tienen los chunks (para saber qué course_id usar en el tutor)
SELECT 
  'Course IDs disponibles' as seccion,
  ccc.course_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT ccc.metadata->>'material_id') as materiales_unicos,
  STRING_AGG(DISTINCT m.title, ', ') as nombres_materiales
FROM course_content_chunks ccc
LEFT JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
GROUP BY ccc.course_id
ORDER BY ccc.course_id;

-- 2. Verificar que los chunks tienen embeddings (necesarios para búsqueda semántica)
SELECT 
  'Chunks con embeddings' as seccion,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_con_embedding,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as chunks_sin_embedding,
  ROUND(COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as porcentaje_con_embedding
FROM course_content_chunks;

-- 3. Búsqueda simulada del tutor para TODOS los course_ids disponibles
-- Esto muestra cuántos chunks encuentra el tutor para cada course_id
SELECT 
  'Búsqueda simulada del tutor (todos los cursos)' as seccion,
  ccc.course_id as course_id_buscado,
  COUNT(*) as chunks_encontrados,
  COUNT(DISTINCT ccc.metadata->>'material_id') as materiales_encontrados,
  COUNT(CASE WHEN ccc.embedding IS NOT NULL THEN 1 END) as chunks_con_embedding_disponibles,
  CASE 
    WHEN COUNT(CASE WHEN ccc.embedding IS NOT NULL THEN 1 END) = COUNT(*) THEN '✅ Todos tienen embedding'
    WHEN COUNT(CASE WHEN ccc.embedding IS NOT NULL THEN 1 END) > 0 THEN '⚠️ Algunos sin embedding'
    ELSE '❌ Ninguno tiene embedding'
  END as estado_embeddings
FROM course_content_chunks ccc
GROUP BY ccc.course_id
ORDER BY ccc.course_id;

-- 4. Ver detalles de los chunks disponibles para el tutor (primeros 10 de cada curso)
SELECT 
  'Detalles de chunks (primeros 10 por curso)' as seccion,
  ccc.id,
  ccc.course_id,
  ccc.chunk_index,
  ccc.metadata->>'material_id' as material_id,
  m.title as material_title,
  CASE 
    WHEN ccc.embedding IS NOT NULL THEN '✅ Tiene embedding'
    ELSE '❌ Sin embedding'
  END as estado_embedding,
  LENGTH(ccc.content) as longitud_contenido,
  LEFT(ccc.content, 100) as preview_contenido
FROM course_content_chunks ccc
LEFT JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.id IN (
  SELECT id 
  FROM course_content_chunks ccc2
  WHERE ccc2.course_id = ccc.course_id
  ORDER BY ccc2.chunk_index
  LIMIT 10
)
ORDER BY ccc.course_id, ccc.chunk_index;

-- 5. Verificar permisos RLS (Row Level Security) - esto puede impedir que el tutor acceda
SELECT 
  'Verificación RLS' as seccion,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'course_content_chunks';

-- 6. Ver políticas RLS si están habilitadas
SELECT 
  'Políticas RLS' as seccion,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'course_content_chunks';

