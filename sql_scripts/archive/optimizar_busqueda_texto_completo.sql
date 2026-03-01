-- =====================================================
-- OPTIMIZACIÓN DE BÚSQUEDA DE TEXTO COMPLETO
-- Para mejorar el rendimiento de búsquedas RAG
-- =====================================================

-- 1. Crear índice GIN para búsqueda de texto completo
-- Este índice acelera significativamente las búsquedas de texto
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_content_gin 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- 2. Crear índice adicional en course_id para búsquedas filtradas
-- Ya debería existir, pero verificamos
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- 3. Crear función optimizada de búsqueda de texto completo
-- Esta función usa PostgreSQL Full-Text Search para búsquedas rápidas
CREATE OR REPLACE FUNCTION search_course_content_chunks_text(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  rank REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.chunk_index,
    ts_rank(
      to_tsvector('spanish', ccc.content), 
      plainto_tsquery('spanish', search_query)
    ) as rank
  FROM course_content_chunks ccc
  WHERE ccc.course_id = course_id_param
    AND to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;

-- 4. Crear función de búsqueda híbrida (texto completo + palabras clave)
-- Útil para búsquedas que incluyen nombres propios o términos específicos
CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  relevance_score REAL
) 
LANGUAGE plpgsql
AS $$
DECLARE
  query_words TEXT[];
BEGIN
  -- Extraer palabras de la consulta
  query_words := string_to_array(lower(search_query), ' ');
  
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.chunk_index,
    -- Calcular score combinado: texto completo + coincidencias de palabras
    (
      COALESCE(
        ts_rank(
          to_tsvector('spanish', ccc.content), 
          plainto_tsquery('spanish', search_query)
        ), 
        0
      ) * 0.7 + 
      -- Bonus por coincidencias exactas de palabras
      (
        SELECT COUNT(*)::REAL / GREATEST(array_length(query_words, 1), 1)
        FROM unnest(query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      ) * 0.3
    ) as relevance_score
  FROM course_content_chunks ccc
  WHERE ccc.course_id = course_id_param
    AND (
      -- Búsqueda de texto completo
      to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query)
      OR
      -- O coincidencias de palabras clave
      EXISTS (
        SELECT 1 
        FROM unnest(query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      )
    )
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$;

-- 5. Verificar índices existentes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'course_content_chunks'
ORDER BY indexname;

-- 6. Analizar rendimiento de las funciones
-- Ejemplo de uso:
-- SELECT * FROM search_course_content_chunks_text('George Cantor', 1, 5);
-- SELECT * FROM search_course_content_chunks_hybrid('historia números', 1, 5);

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. El índice GIN puede tardar en crearse si hay muchos chunks
-- 2. Las funciones usan 'spanish' como idioma para mejor búsqueda en español
-- 3. La función híbrida combina búsqueda de texto completo con búsqueda de palabras clave
-- 4. Para usar estas funciones en el código, actualizar ragService.ts para llamar a:
--    supabase.rpc('search_course_content_chunks_text', { ... })
--    o
--    supabase.rpc('search_course_content_chunks_hybrid', { ... })

