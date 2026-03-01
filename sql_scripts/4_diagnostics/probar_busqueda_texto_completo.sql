-- =====================================================
-- PROBAR: Búsqueda de texto completo con la función RPC
-- Verificar si encuentra "Estadificación del cáncer mamario"
-- =====================================================

-- 1. Probar la función RPC con diferentes variaciones del texto
SELECT 
  id,
  metadata->>'pageStart' as pagina_inicio,
  metadata->>'pageEnd' as pagina_fin,
  LEFT(content, 400) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'Estadificación del cáncer mamario',
  12,
  10,
  0.001
)
LIMIT 10;

-- 2. Probar sin acentos
SELECT 
  id,
  metadata->>'pageStart' as pagina_inicio,
  metadata->>'pageEnd' as pagina_fin,
  LEFT(content, 400) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'estadificacion del cancer mamario',
  12,
  10,
  0.001
)
LIMIT 10;

-- 3. Probar términos más específicos
SELECT 
  id,
  metadata->>'pageStart' as pagina_inicio,
  metadata->>'pageEnd' as pagina_fin,
  LEFT(content, 400) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'estadificacion cancer mama',
  12,
  10,
  0.001
)
LIMIT 10;

-- 4. Probar con "TNM" y "estadio"
SELECT 
  id,
  metadata->>'pageStart' as pagina_inicio,
  metadata->>'pageEnd' as pagina_fin,
  LEFT(content, 400) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'TNM estadio cancer mamario',
  12,
  10,
  0.001
)
LIMIT 10;
