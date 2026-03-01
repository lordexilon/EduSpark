-- Diagnóstico completo de búsqueda vectorial

-- 1. Verificar que los chunks tienen embeddings
SELECT 
    'Chunks con embedding' as verificacion,
    COUNT(*) as total,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as con_embedding,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as sin_embedding
FROM course_content_chunks
WHERE metadata->>'material_id' IN (
    '6a695969-78c1-42ea-af24-f6f2e2f88332',
    '79882510-d16f-447b-802a-1f73cdce1c04'
);

-- 2. Verificar que la función RPC existe
SELECT 
    proname as nombre_funcion,
    pg_get_functiondef(oid) as definicion
FROM pg_proc
WHERE proname = 'search_course_content_chunks';

-- 3. Probar la función RPC directamente con un embedding de prueba
-- Primero, obtener un embedding real de la BD
WITH sample_embedding AS (
    SELECT embedding
    FROM course_content_chunks
    WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
      AND embedding IS NOT NULL
    LIMIT 1
)
SELECT 
    'Test búsqueda vectorial' as prueba,
    COUNT(*) as resultados_encontrados
FROM course_content_chunks ccc, sample_embedding
WHERE ccc.course_id = 12
  AND ccc.embedding IS NOT NULL
  AND 1 - (ccc.embedding <=> sample_embedding.embedding) > 0.5;

-- 4. Verificar el tipo de dato del embedding
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'course_content_chunks'
  AND column_name = 'embedding';
