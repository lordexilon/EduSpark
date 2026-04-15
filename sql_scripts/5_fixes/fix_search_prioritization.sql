-- Funciones de búsqueda mejoradas que priorizan por título del material
-- Esto evitará que devuelva documentos que solo MENCIONAN "Harrison" en referencias

DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(text, integer, integer, double precision);

CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 15,
  min_relevance FLOAT DEFAULT 0.01
)
RETURNS SETOF course_content_chunks AS $$
BEGIN
  RETURN QUERY
  WITH ranked_chunks AS (
    SELECT 
      ccc.*,
      -- Scoring: chunks de materiales cuyo título coincide tienen +100 de score
      CASE 
        WHEN m.title ILIKE '%' || COALESCE(NULLIF(regexp_replace(search_query, '[^a-zA-Z0-9]', ' ', 'g'), ''), 'nomatch') || '%' 
        THEN 100
        ELSE 0
      END + 
      ts_rank(to_tsvector('spanish', ccc.content), websearch_to_tsquery('spanish', search_query)) as relevance_score
    FROM course_content_chunks ccc
    LEFT JOIN materials m ON m.id::text = ccc.metadata->>'material_id'
    WHERE ccc.course_id = course_id_param
      AND to_tsvector('spanish', ccc.content) @@ websearch_to_tsquery('spanish', search_query)
  )
  SELECT 
    id, course_id, content, embedding, metadata, created_at
  FROM ranked_chunks
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
