-- =====================================================
-- PROBAR: Búsqueda "estadio cancer mama" con la función RPC
-- Verificar por qué no encuentra el contenido que existe
-- =====================================================

-- 1. Probar la función RPC exactamente como la usa el sistema
SELECT 
  id,
  metadata->>'file_name' as archivo,
  metadata->>'pageStart' as pagina_inicio,
  metadata->>'pageEnd' as pagina_fin,
  LEFT(content, 400) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'estadio cancer mama',
  12,
  15,
  0.001
)
LIMIT 15;

-- 2. Probar variaciones de la búsqueda
SELECT 
  id,
  metadata->>'file_name' as archivo,
  metadata->>'pageStart' as pagina_inicio,
  LEFT(content, 400) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'estadio mama',
  12,
  15,
  0.001
)
LIMIT 15;

-- 3. Probar con "TNM" que sabemos que está en el contenido
SELECT 
  id,
  metadata->>'file_name' as archivo,
  metadata->>'pageStart' as pagina_inicio,
  LEFT(content, 400) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'TNM estadio',
  12,
  15,
  0.001
)
LIMIT 15;

-- 4. Verificar si las palabras están en los chunks de Williams Gineco.pdf
SELECT 
  metadata->>'pageStart' as pagina_inicio,
  metadata->>'pageEnd' as pagina_fin,
  CASE 
    WHEN content ILIKE '%estadio%' THEN 'Tiene "estadio"'
    ELSE 'No tiene "estadio"'
  END as tiene_estadio,
  CASE 
    WHEN content ILIKE '%cancer%' OR content ILIKE '%cáncer%' THEN 'Tiene "cancer"'
    ELSE 'No tiene "cancer"'
  END as tiene_cancer,
  CASE 
    WHEN content ILIKE '%mama%' OR content ILIKE '%mamario%' THEN 'Tiene "mama"'
    ELSE 'No tiene "mama"'
  END as tiene_mama,
  LEFT(content, 300) as contenido_preview
FROM course_content_chunks
WHERE 
  course_id = 12
  AND metadata->>'file_name' = 'Williams Gineco.pdf'
  AND metadata->>'pageStart' >= '371'
  AND metadata->>'pageStart' <= '375'
LIMIT 5;
