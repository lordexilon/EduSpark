-- Verificar que el tutor AI puede encontrar los chunks
-- Ejecutar en Supabase SQL Editor

-- 1. Ver qué course_id tienen los chunks (para saber qué course_id usar en el tutor)
SELECT 
  'Course IDs disponibles' as seccion,
  course_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT metadata->>'material_id') as materiales_unicos,
  STRING_AGG(DISTINCT m.title, ', ') as nombres_materiales
FROM course_content_chunks ccc
LEFT JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
GROUP BY course_id
ORDER BY course_id;

-- 2. Verificar que los chunks tienen embeddings (necesarios para búsqueda semántica)
SELECT 
  'Chunks con embeddings' as seccion,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_con_embedding,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as chunks_sin_embedding,
  ROUND(COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as porcentaje_con_embedding
FROM course_content_chunks;

-- 3. Simular búsqueda del tutor para un course_id específico
-- ⚠️ IMPORTANTE: Reemplaza 999 con el course_id que aparece en el resultado del paso 1
-- Ejemplo: Si el course_id es 5, cambia WHERE course_id = 999 por WHERE course_id = 5
SELECT 
  'Búsqueda simulada del tutor' as seccion,
  999 as course_id_buscado,  -- ⚠️ CAMBIAR 999 por el course_id real (ejemplo: 5)
  COUNT(*) as chunks_encontrados,
  COUNT(DISTINCT metadata->>'material_id') as materiales_encontrados,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_con_embedding_disponibles
FROM course_content_chunks
WHERE course_id = 999;  -- ⚠️ CAMBIAR 999 por el course_id real (ejemplo: 5)

-- 4. Ver detalles de los chunks disponibles para el tutor
-- ⚠️ IMPORTANTE: Reemplaza 999 con el course_id que aparece en el resultado del paso 1
SELECT 
  'Detalles de chunks' as seccion,
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
WHERE ccc.course_id = 999  -- ⚠️ CAMBIAR 999 por el course_id real (ejemplo: 5)
ORDER BY ccc.chunk_index
LIMIT 10;

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

