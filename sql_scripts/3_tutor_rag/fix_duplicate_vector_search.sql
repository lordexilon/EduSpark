-- Eliminar funciones duplicadas de búsqueda vectorial y crear una sola versión correcta

-- 1. Eliminar TODAS las versiones de la función
DROP FUNCTION IF EXISTS search_course_content_chunks(vector, text, double precision, integer);
DROP FUNCTION IF EXISTS search_course_content_chunks(vector, double precision, integer, text);

-- 2. Crear UNA SOLA versión con la firma correcta
CREATE OR REPLACE FUNCTION search_course_content_chunks(
  query_embedding vector,
  course_id_param text,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  course_id integer,
  content text,
  embedding vector(768),
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ccc.id,
    ccc.course_id,
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

-- 3. Verificar que solo existe una versión
SELECT 
    proname as nombre_funcion,
    pg_get_function_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'search_course_content_chunks';
