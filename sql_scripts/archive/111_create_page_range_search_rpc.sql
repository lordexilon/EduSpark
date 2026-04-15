-- =====================================================
-- RPC PARA BÚSQUEDA POR RANGO DE PÁGINAS (MULTI-CURSO)
-- Reemplaza la query directa en ragService.ts
-- =====================================================

CREATE OR REPLACE FUNCTION get_chunks_in_page_range(
  p_course_id INTEGER,
  p_page_start INTEGER,
  p_page_end INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  document_id UUID,
  original_course_id INTEGER
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
    ccc.document_id,
    ccc.course_id::integer as original_course_id
  FROM course_content_chunks ccc
  WHERE 
    -- 1. Pertenecen al curso (directo o asignado)
    (
      ccc.course_id = p_course_id
      OR
      EXISTS (
        SELECT 1 FROM document_course_assignments dca
        WHERE dca.document_id = ccc.document_id
        AND dca.course_id = p_course_id
      )
    )
    -- 2. Están en el rango de páginas (usando metadatos)
    AND (
      -- Caso A: Metadata tiene pageStart/pageEnd
      (
        (ccc.metadata->>'pageStart')::int BETWEEN p_page_start AND p_page_end
        OR
        (ccc.metadata->>'pageEnd')::int BETWEEN p_page_start AND p_page_end
        OR
        ((ccc.metadata->>'pageStart')::int <= p_page_start AND (ccc.metadata->>'pageEnd')::int >= p_page_end)
      )
      OR
      -- Caso B: Metadata tiene page_start/page_end (alias)
      (
        (ccc.metadata->>'page_start')::int BETWEEN p_page_start AND p_page_end
        OR
        (ccc.metadata->>'page_end')::int BETWEEN p_page_start AND p_page_end
        OR
        ((ccc.metadata->>'page_start')::int <= p_page_start AND (ccc.metadata->>'page_end')::int >= p_page_end)
      )
    )
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_chunks_in_page_range IS 
'Obtiene chunks dentro de un rango de páginas, incluyendo documentos asignados desde otros cursos.';
