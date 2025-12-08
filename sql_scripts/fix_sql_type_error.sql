-- FIX CRÍTICO: Función de búsqueda con tipos correctos
-- El problema es que la función debe retornar EXACTAMENTE los mismos tipos que la tabla

DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(text, integer, integer, double precision);

CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 15,
  min_relevance FLOAT DEFAULT 0.01
)
RETURNS TABLE(
  id uuid,
  course_id integer,
  content text,
  embedding vector(768),
  metadata jsonb,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_chunks AS (
    SELECT 
      ccc.id,
      ccc.course_id,
      ccc.content,
      ccc.embedding,
      ccc.metadata,
      ccc.created_at,
      -- Scoring: chunks de materiales cuyo título coincide tienen +100 de score
      CASE 
        WHEN m.title ILIKE '%' || search_query || '%' 
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
    ranked_chunks.id,
    ranked_chunks.course_id,
    ranked_chunks.content,
    ranked_chunks.embedding,
    ranked_chunks.metadata,
    ranked_chunks.created_at
  FROM ranked_chunks
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
