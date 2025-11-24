-- Diagnóstico rápido: Verificar por qué el tutor no encuentra los chunks
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Ver qué course_id tienen los chunks
SELECT 
  'Chunks por course_id' as seccion,
  course_id,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT metadata->>'material_id') as materiales_unicos
FROM course_content_chunks
GROUP BY course_id
ORDER BY course_id;

-- PASO 2: Ver qué course_id tienen los materiales procesados
SELECT 
  'Materiales procesados' as seccion,
  id as material_id,
  title,
  course_id,
  rag_status
FROM materials
WHERE rag_status = 'completed'
ORDER BY course_id, created_at DESC;

-- PASO 3: Comparar course_id entre materiales y chunks
SELECT 
  'Comparación' as seccion,
  m.id as material_id,
  m.title,
  m.course_id as material_course_id,
  ccc.course_id as chunk_course_id,
  CASE 
    WHEN m.course_id = ccc.course_id THEN '✅ Coinciden'
    WHEN ccc.course_id IS NULL THEN '❌ Chunk sin course_id'
    ELSE '❌ NO coinciden'
  END as estado,
  COUNT(ccc.id) as chunks_count
FROM materials m
LEFT JOIN course_content_chunks ccc 
  ON ccc.metadata->>'material_id' = m.id::text
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.title, m.course_id, ccc.course_id
ORDER BY estado, m.course_id;

-- PASO 4: Verificar tipo de dato de course_id
SELECT 
  'Tipo de dato' as seccion,
  course_id,
  pg_typeof(course_id) as tipo,
  COUNT(*) as cantidad
FROM course_content_chunks
GROUP BY course_id, pg_typeof(course_id);

-- PASO 5: Simular búsqueda del tutor (reemplazar X con el course_id que usas en el tutor)
-- IMPORTANTE: Cambia el número X por el course_id del curso que estás usando en el tutor
SELECT 
  'Búsqueda simulada del tutor' as seccion,
  X as course_id_buscado,  -- ⚠️ CAMBIAR X por el course_id real
  COUNT(*) as chunks_encontrados,
  COUNT(DISTINCT metadata->>'material_id') as materiales_encontrados
FROM course_content_chunks
WHERE course_id = X;  -- ⚠️ CAMBIAR X por el course_id real

-- Si chunks_encontrados es 0, entonces el problema es que el course_id no coincide
-- Si chunks_encontrados > 0, entonces el problema está en otro lugar (RLS, permisos, etc.)

