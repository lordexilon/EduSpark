-- REPARAR: Función RPC search_course_content_chunks que está dando error 500

-- 1. Verificar si la función existe
SELECT
    proname,
    pg_get_function_identity_arguments(oid) as argumentos,
    obj_description(oid, 'pg_proc') as descripcion
FROM pg_proc
WHERE proname = 'search_course_content_chunks';

-- 2. Si existe, eliminarla (podría estar corrupta)
DROP FUNCTION IF EXISTS search_course_content_chunks(text, integer, float, integer);

-- 3. Crear la función corregida
CREATE OR REPLACE FUNCTION search_course_content_chunks(
    query_embedding text,
    course_id_param integer,
    match_threshold float DEFAULT 0.1,
    match_count integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    course_id integer,
    content text,
    embedding vector(768),
    metadata jsonb,
    created_at timestamp with time zone,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ccc.id,
        ccc.course_id,
        ccc.content,
        ccc.embedding,
        ccc.metadata,
        ccc.created_at,
        (ccc.embedding <=> query_embedding::vector) as similarity
    FROM course_content_chunks ccc
    WHERE ccc.course_id = course_id_param
      AND (ccc.embedding <=> query_embedding::vector) > match_threshold
    ORDER BY ccc.embedding <=> query_embedding::vector
    LIMIT match_count;
END;
$$;

-- 4. Verificar que la función se creó correctamente
SELECT
    proname,
    pg_get_function_identity_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'search_course_content_chunks';

COMMENT ON FUNCTION search_course_content_chunks(text, integer, float, integer) IS
'Función para búsqueda vectorial de chunks de contenido usando embeddings de Gemini';