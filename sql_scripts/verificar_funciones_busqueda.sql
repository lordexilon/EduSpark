-- =====================================================
-- VERIFICACIÓN DE FUNCIONES DE BÚSQUEDA
-- Verifica que las funciones existan y tengan los parámetros correctos
-- =====================================================

-- 1. Verificar si las funciones existen
SELECT 
  'Verificación de funciones' as paso,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'search_course_content_chunks_text_clean',
    'search_course_content_chunks_hybrid_clean',
    'search_course_content_chunks'
  )
ORDER BY routine_name;

-- 2. Ver parámetros de search_course_content_chunks_text_clean
SELECT 
  'Parámetros de search_course_content_chunks_text_clean' as paso,
  parameter_name,
  data_type,
  parameter_default
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name = (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'search_course_content_chunks_text_clean'
    LIMIT 1
  )
ORDER BY ordinal_position;

-- 3. Ver parámetros de search_course_content_chunks_hybrid_clean
SELECT 
  'Parámetros de search_course_content_chunks_hybrid_clean' as paso,
  parameter_name,
  data_type,
  parameter_default
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name = (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'search_course_content_chunks_hybrid_clean'
    LIMIT 1
  )
ORDER BY ordinal_position;

-- 4. Probar la función con parámetros simples
SELECT 
  'Prueba de función search_course_content_chunks_text_clean' as paso,
  *
FROM search_course_content_chunks_text_clean(
  'Dedekind'::TEXT,
  1::INTEGER,
  5::INTEGER,
  0.01::REAL
)
LIMIT 3;

-- 5. Verificar si hay chunks con Dedekind
SELECT 
  'Chunks con Dedekind' as paso,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT course_id) as cursos_diferentes
FROM course_content_chunks
WHERE content ILIKE '%dedekind%';

