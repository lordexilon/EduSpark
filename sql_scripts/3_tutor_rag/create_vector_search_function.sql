-- sql_scripts/create_vector_search_function.sql
-- Función para búsqueda vectorial en course_content_chunks

-- Eliminar todas las versiones posibles de la función si existen
-- Esto evita el error de ambigüedad cuando hay múltiples funciones con el mismo nombre
DO $$ 
BEGIN
  -- Intentar eliminar todas las variantes posibles
  DROP FUNCTION IF EXISTS search_course_content_chunks(vector, text, float, int);
  DROP FUNCTION IF EXISTS search_course_content_chunks(vector, text);
  DROP FUNCTION IF EXISTS search_course_content_chunks(vector, text, float);
  DROP FUNCTION IF EXISTS search_course_content_chunks(vector, text, int);
EXCEPTION 
  WHEN OTHERS THEN
    -- Si falla, continuar (puede que no exista)
    NULL;
END $$;

-- Crear función de búsqueda vectorial
-- Compatible con course_id como INTEGER o TEXT
CREATE FUNCTION search_course_content_chunks(
  query_embedding vector(768),
  course_id_param text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  course_id text,
  content text,
  embedding vector(768),
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ccc.id,
    ccc.course_id::text,
    ccc.content,
    ccc.embedding,
    ccc.metadata,
    1 - (ccc.embedding <=> query_embedding) as similarity
  FROM course_content_chunks ccc
  WHERE 
    (ccc.course_id::text = course_id_param OR ccc.course_id::integer::text = course_id_param)
    AND ccc.embedding IS NOT NULL
    AND 1 - (ccc.embedding <=> query_embedding) > match_threshold
  ORDER BY ccc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comentario sobre la función
COMMENT ON FUNCTION search_course_content_chunks IS 
'Busca chunks de contenido similares usando búsqueda vectorial. 
Retorna los chunks más similares al embedding de la consulta, 
filtrados por course_id y con un umbral de similitud mínimo.';

