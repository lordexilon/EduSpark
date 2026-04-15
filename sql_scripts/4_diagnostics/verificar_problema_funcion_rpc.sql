-- =====================================================
-- VERIFICAR: Por qué la función RPC no devuelve Williams Gineco.pdf
-- Aunque cumple_tsquery = true y tiene relevance_score = 0.417
-- =====================================================

-- 1. Verificar si existe la tabla materials y si tiene registros
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('materials', 'course_materials')
ORDER BY table_name, ordinal_position
LIMIT 20;

-- 2. Verificar si hay un material registrado para Williams Gineco.pdf en course_materials
SELECT 
  m.id,
  m.title,
  m.course_id
FROM course_materials m
WHERE 
  m.course_id = 12
  AND (m.title ILIKE '%williams%gineco%' OR m.title ILIKE '%gineco%');

-- 3. Verificar el material_id de los chunks de Williams Gineco.pdf
SELECT DISTINCT
  c.metadata->>'material_id' as material_id,
  m.title as material_title,
  COUNT(*) as cantidad_chunks
FROM course_content_chunks c
LEFT JOIN course_materials m ON c.metadata->>'material_id' = m.id::TEXT
WHERE 
  c.course_id = 12
  AND c.metadata->>'file_name' = 'Williams Gineco.pdf'
GROUP BY c.metadata->>'material_id', m.title
LIMIT 10;

-- 4. Verificar si la tabla materials existe y tiene registros
SELECT COUNT(*) as total_materials
FROM materials
LIMIT 1;

-- 5. Verificar si hay material en materials para Williams Gineco.pdf
SELECT 
  m.id,
  m.title
FROM materials m
WHERE m.title ILIKE '%williams%gineco%' OR m.title ILIKE '%gineco%'
LIMIT 10;

-- 6. Probar la función RPC sin el JOIN a materials (simular)
-- Verificar si el problema es el JOIN
SELECT 
  ccc.id,
  ccc.metadata->>'file_name' as archivo,
  ccc.metadata->>'pageStart' as pagina_inicio,
  ccc.metadata->>'pageEnd' as pagina_fin,
  ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama')) as relevance_score,
  CASE 
    WHEN m.title ILIKE '%estadio%cancer%mama%' OR m.title ILIKE '%estadio%' OR m.title ILIKE '%cancer%mama%'
    THEN 100
    ELSE 0
  END as bonus_titulo,
  CASE 
    WHEN m.title ILIKE '%estadio%cancer%mama%' OR m.title ILIKE '%estadio%' OR m.title ILIKE '%cancer%mama%'
    THEN 100
    ELSE 0
  END + ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama')) as relevance_score_total,
  LEFT(ccc.content, 200) as contenido_preview
FROM course_content_chunks ccc
LEFT JOIN course_materials m ON m.id::TEXT = ccc.metadata->>'material_id'
WHERE 
  ccc.course_id = 12
  AND ccc.metadata->>'file_name' = 'Williams Gineco.pdf'
  AND ccc.metadata->>'pageStart' >= '371'
  AND ccc.metadata->>'pageStart' <= '375'
  AND to_tsvector('spanish', ccc.content) @@ websearch_to_tsquery('spanish', 'estadio cancer mama')
ORDER BY relevance_score_total DESC
LIMIT 5;

-- 7. Comparar con Schwartz para ver el bonus de título
SELECT 
  ccc.metadata->>'file_name' as archivo,
  m.title as material_title,
  CASE 
    WHEN m.title ILIKE '%estadio%cancer%mama%' OR m.title ILIKE '%estadio%' OR m.title ILIKE '%cancer%mama%'
    THEN 100
    ELSE 0
  END as bonus_titulo,
  ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama')) as relevance_score,
  CASE 
    WHEN m.title ILIKE '%estadio%cancer%mama%' OR m.title ILIKE '%estadio%' OR m.title ILIKE '%cancer%mama%'
    THEN 100
    ELSE 0
  END + ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', 'estadio cancer mama')) as relevance_score_total
FROM course_content_chunks ccc
LEFT JOIN course_materials m ON m.id::TEXT = ccc.metadata->>'material_id'
WHERE 
  ccc.course_id = 12
  AND ccc.metadata->>'file_name' IN ('Williams Gineco.pdf', 'Schwartz Principios de Cirugia 11a Edicion.pdf')
  AND to_tsvector('spanish', ccc.content) @@ websearch_to_tsquery('spanish', 'estadio cancer mama')
ORDER BY relevance_score_total DESC
LIMIT 20;
