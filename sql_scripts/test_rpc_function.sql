-- Test directo de la función RPC con un embedding real

-- 1. Obtener un embedding de Harrison
WITH harrison_embedding AS (
    SELECT embedding
    FROM course_content_chunks
    WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
      AND embedding IS NOT NULL
    LIMIT 1
)
-- 2. Llamar a la función RPC exactamente como lo hace el código
SELECT 
    id,
    course_id,
    left(content, 100) as content_preview,
    metadata->>'material_id' as material_id,
    similarity
FROM search_course_content_chunks(
    (SELECT embedding FROM harrison_embedding),
    '12',  -- course_id_param como string
    0.5,   -- match_threshold
    10     -- match_count
)
ORDER BY similarity DESC;

-- 3. Si lo anterior no funciona, probar con course_id como integer
WITH harrison_embedding AS (
    SELECT embedding
    FROM course_content_chunks
    WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
      AND embedding IS NOT NULL
    LIMIT 1
)
SELECT COUNT(*) as total_resultados
FROM search_course_content_chunks(
    (SELECT embedding FROM harrison_embedding),
    '12',
    0.5,
    10
);
