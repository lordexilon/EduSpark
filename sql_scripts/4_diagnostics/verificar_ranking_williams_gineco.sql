-- =====================================================
-- VERIFICAR: Ranking de resultados para "estadio cancer mama"
-- Por qué Williams Gineco.pdf no aparece en los primeros resultados
-- =====================================================

-- 1. Verificar si Williams Gineco.pdf aparece en los resultados (aumentar límite)
SELECT 
  id,
  metadata->>'file_name' as archivo,
  metadata->>'pageStart' as pagina_inicio,
  metadata->>'pageEnd' as pagina_fin,
  LEFT(content, 300) as contenido_preview
FROM search_course_content_chunks_text_clean(
  'estadio cancer mama',
  12,
  50,  -- Aumentar límite para ver más resultados
  0.001
)
WHERE metadata->>'file_name' = 'Williams Gineco.pdf'
LIMIT 20;

-- 2. Calcular ranking manualmente para Williams Gineco.pdf
SELECT 
  ccc.id,
  ccc.metadata->>'file_name' as archivo,
  ccc.metadata->>'pageStart' as pagina_inicio,
  ccc.metadata->>'pageEnd' as pagina_fin,
  ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama')) as relevance_score,
  LEFT(ccc.content, 300) as contenido_preview
FROM course_content_chunks ccc
WHERE 
  ccc.course_id = 12
  AND ccc.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND (
    ccc.metadata->>'pageStart' >= '365' AND ccc.metadata->>'pageStart' <= '380'
  )
  AND to_tsvector('spanish', ccc.content) @@ websearch_to_tsquery('spanish', 'estadio cancer mama')
ORDER BY relevance_score DESC
LIMIT 10;

-- 3. Comparar ranking entre Schwartz y Williams Gineco
SELECT 
  ccc.metadata->>'file_name' as archivo,
  COUNT(*) as cantidad_chunks_encontrados,
  AVG(ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama'))) as promedio_relevance,
  MAX(ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama'))) as max_relevance,
  MIN(ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama'))) as min_relevance
FROM course_content_chunks ccc
WHERE 
  ccc.course_id = 12
  AND ccc.metadata->>'file_name' IN ('Williams Gineco.pdf', 'Schwartz Principios de Cirugia 11a Edicion.pdf')
  AND to_tsvector('spanish', ccc.content) @@ websearch_to_tsquery('spanish', 'estadio cancer mama')
GROUP BY ccc.metadata->>'file_name'
ORDER BY max_relevance DESC;

-- 4. Verificar si las palabras están en Williams Gineco.pdf
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
  to_tsvector('spanish', content) @@ websearch_to_tsquery('spanish', 'estadio cancer mama') as cumple_tsquery,
  ts_rank(to_tsvector('spanish', content), websearch_to_tsquery('spanish', 'estadio cancer mama')) as relevance_score,
  LEFT(content, 200) as contenido_preview
FROM course_content_chunks
WHERE 
  course_id = 12
  AND metadata->>'file_name' = 'Williams Gineco.pdf'
  AND metadata->>'pageStart' >= '371'
  AND metadata->>'pageStart' <= '375'
LIMIT 5;
