-- =====================================================
-- SCRIPT DE DIAGNÓSTICO: Buscar contenido sobre Dedekind
-- Para verificar que el contenido existe y puede ser encontrado
-- =====================================================

-- 1. Buscar chunks que mencionan "Dedekind" o "dedekind"
SELECT 
  id,
  course_id,
  LEFT(content, 200) as content_preview,
  LENGTH(content) as content_length,
  metadata->>'material_id' as material_id,
  metadata->>'sourceFileName' as source_file,
  chunk_index
FROM course_content_chunks
WHERE 
  content ILIKE '%dedekind%'
ORDER BY chunk_index;

-- 2. Verificar si los chunks tienen ruido que impide la búsqueda
SELECT 
  id,
  course_id,
  CASE 
    WHEN content ~ '(\d)\1{5,}' THEN 'Tiene secuencias repetitivas'
    WHEN (
      SELECT COUNT(*)::REAL / GREATEST(length(content), 1)
      FROM regexp_split_to_table(content, '') AS char
      WHERE char ~ '[^\w\s]'
    ) > 0.4 THEN 'Demasiados caracteres especiales'
    WHEN (
      SELECT COUNT(*)::REAL / GREATEST(length(content), 1)
      FROM regexp_split_to_table(content, '') AS char
      WHERE char ~ '\d'
    ) > 0.7 THEN 'Demasiados números'
    ELSE 'OK'
  END as estado_ruido,
  metadata->>'is_noise' as marcado_como_ruido
FROM course_content_chunks
WHERE 
  content ILIKE '%dedekind%';

-- 3. Probar búsqueda de texto completo
SELECT 
  id,
  LEFT(content, 200) as content_preview,
  ts_rank(
    to_tsvector('spanish', content), 
    plainto_tsquery('spanish', 'Dedekind')
  ) as rank
FROM course_content_chunks
WHERE 
  course_id = 1  -- Cambiar por el course_id correcto
  AND to_tsvector('spanish', content) @@ plainto_tsquery('spanish', 'Dedekind')
ORDER BY rank DESC
LIMIT 5;

-- 4. Probar función de búsqueda mejorada
SELECT * FROM search_course_content_chunks_text_clean(
  'Dedekind',
  1,  -- course_id
  5,  -- result_limit
  0.05  -- min_relevance (muy bajo para encontrar todo)
);

-- 5. Verificar si el contenido tiene letras (contenido válido)
SELECT 
  id,
  LENGTH(content) as total_chars,
  (
    SELECT COUNT(*) 
    FROM regexp_split_to_table(content, '') AS char
    WHERE char ~ '[a-zA-Z]'
  ) as letras_count,
  (
    SELECT COUNT(*) 
    FROM regexp_split_to_table(content, '') AS char
    WHERE char ~ '\d'
  ) as numeros_count,
  (
    SELECT COUNT(*)::REAL / GREATEST(length(content), 1)
    FROM regexp_split_to_table(content, '') AS char
    WHERE char ~ '[a-zA-Z]'
  ) as porcentaje_letras
FROM course_content_chunks
WHERE 
  content ILIKE '%dedekind%'
ORDER BY porcentaje_letras DESC;

