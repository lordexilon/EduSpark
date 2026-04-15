-- =====================================================
-- FUNCIÓN RPC: audit_rag_system
-- Retorna un informe completo del estado del sistema RAG
-- Usar: SELECT * FROM audit_rag_system();
-- =====================================================

CREATE OR REPLACE FUNCTION audit_rag_system()
RETURNS TABLE (
  metric_name TEXT,
  metric_value TEXT,
  details JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Resumen General
  RETURN QUERY
  SELECT 
    'total_chunks'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Total de chunks en el sistema')
  FROM course_content_chunks;

  RETURN QUERY
  SELECT 
    'chunks_with_embeddings'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object(
      'description', 'Chunks con vectores de embedding',
      'percentage', ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM course_content_chunks), 0) * 100, 2)
    )
  FROM course_content_chunks
  WHERE embedding IS NOT NULL;

  RETURN QUERY
  SELECT 
    'chunks_without_embeddings'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Chunks SIN vectores - requieren reprocesamiento')
  FROM course_content_chunks
  WHERE embedding IS NULL;

  -- 2. Información de páginas
  RETURN QUERY
  SELECT 
    'chunks_with_page_info'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object(
      'description', 'Chunks con información de páginas (pageStart/pageEnd)',
      'with_pageStart', (SELECT COUNT(*) FROM course_content_chunks WHERE metadata->>'pageStart' IS NOT NULL)
    )
  FROM course_content_chunks
  WHERE metadata->>'pageStart' IS NOT NULL 
     OR metadata->>'page_start' IS NOT NULL;

  RETURN QUERY
  SELECT 
    'chunks_without_page_info'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Chunks SIN información de páginas')
  FROM course_content_chunks
  WHERE metadata->>'pageStart' IS NULL 
    AND metadata->>'page_start' IS NULL;

  -- 3. Materiales
  RETURN QUERY
  SELECT 
    'total_materials'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Total de materiales registrados')
  FROM materials
  WHERE kind = 'pdf' OR purpose IN ('rag', 'both');

  RETURN QUERY
  SELECT 
    'materials_completed'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Materiales con rag_status = completed')
  FROM materials
  WHERE rag_status = 'completed';

  RETURN QUERY
  SELECT 
    'materials_pending'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Materiales pendientes de procesamiento')
  FROM materials
  WHERE rag_status IN ('pending', 'processing');

  RETURN QUERY
  SELECT 
    'materials_failed'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Materiales con errores de procesamiento')
  FROM materials
  WHERE rag_status = 'failed';

  -- 4. Cursos
  RETURN QUERY
  SELECT 
    'courses_with_chunks'::TEXT,
    COUNT(DISTINCT course_id)::TEXT,
    jsonb_build_object('description', 'Cursos con al menos 1 chunk procesado')
  FROM course_content_chunks;

  -- 5. Documentos asignados a múltiples cursos
  RETURN QUERY
  SELECT 
    'document_course_assignments'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object(
      'description', 'Asignaciones de documentos a cursos',
      'unique_documents', (SELECT COUNT(DISTINCT document_id) FROM document_course_assignments)
    )
  FROM document_course_assignments;

  -- 6. Jobs de procesamiento
  RETURN QUERY
  SELECT 
    'processing_jobs_pending'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Jobs en estado pending')
  FROM file_processing_jobs
  WHERE status = 'pending';

  RETURN QUERY
  SELECT 
    'processing_jobs_completed'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Jobs completados')
  FROM file_processing_jobs
  WHERE status = 'completed';

  RETURN QUERY
  SELECT 
    'processing_jobs_failed'::TEXT,
    COUNT(*)::TEXT,
    jsonb_build_object('description', 'Jobs fallidos')
  FROM file_processing_jobs
  WHERE status = 'failed';

  -- 7. Graph RAG (si existe)
  RETURN QUERY
  SELECT 
    'graph_nodes'::TEXT,
    COALESCE(COUNT(*)::TEXT, '0'),
    jsonb_build_object('description', 'Nodos en el grafo de conocimiento')
  FROM graph_nodes;

  RETURN QUERY
  SELECT 
    'graph_edges'::TEXT,
    COALESCE(COUNT(*)::TEXT, '0'),
    jsonb_build_object('description', 'Aristas en el grafo de conocimiento')
  FROM graph_edges;

END;
$$;

COMMENT ON FUNCTION audit_rag_system IS 
'Retorna un informe completo del estado del sistema RAG. 
Incluye métricas de chunks, embeddings, materiales, cursos y procesamiento.
Uso: SELECT * FROM audit_rag_system();';

-- =====================================================
-- FUNCIÓN: get_materials_without_chunks
-- Lista materiales que deberían tener chunks pero no los tienen
-- =====================================================

CREATE OR REPLACE FUNCTION get_materials_without_chunks()
RETURNS TABLE (
  material_id UUID,
  title TEXT,
  course_id INTEGER,
  course_name TEXT,
  rag_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.course_id,
    c.title as course_name,
    m.rag_status,
    m.created_at
  FROM materials m
  LEFT JOIN courses c ON c.id = m.course_id
  LEFT JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
  WHERE (m.kind = 'pdf' OR m.purpose IN ('rag', 'both'))
    AND m.rag_status = 'completed'
    AND ccc.id IS NULL
  ORDER BY m.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_materials_without_chunks IS 
'Identifica materiales marcados como completed pero sin chunks procesados.
Estos materiales podrían necesitar reprocesamiento.';

-- =====================================================
-- FUNCIÓN: get_chunks_sample
-- Retorna una muestra de chunks para un curso específico
-- =====================================================

CREATE OR REPLACE FUNCTION get_chunks_sample(
  p_course_id INTEGER,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  chunk_index INTEGER,
  content_preview TEXT,
  page_start TEXT,
  page_end TEXT,
  material_id TEXT,
  has_embedding BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.chunk_index,
    LEFT(ccc.content, 200) as content_preview,
    COALESCE(ccc.metadata->>'pageStart', ccc.metadata->>'page_start') as page_start,
    COALESCE(ccc.metadata->>'pageEnd', ccc.metadata->>'page_end') as page_end,
    ccc.metadata->>'material_id' as material_id,
    ccc.embedding IS NOT NULL as has_embedding
  FROM course_content_chunks ccc
  WHERE ccc.course_id = p_course_id
  ORDER BY ccc.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_chunks_sample IS 
'Retorna una muestra de chunks para un curso específico.
Útil para verificar el contenido y metadatos de los chunks procesados.
Uso: SELECT * FROM get_chunks_sample(12, 10);';
