-- Verificar chunks de Harrison Tomo 1 y Tomo 2

-- TOMO 1
SELECT 
    'TOMO 1' as libro,
    (embedding IS NOT NULL) as tiene_embedding,
    COUNT(*) as cantidad
FROM course_content_chunks
WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
GROUP BY (embedding IS NOT NULL);

-- TOMO 2
SELECT 
    'TOMO 2' as libro,
    (embedding IS NOT NULL) as tiene_embedding,
    COUNT(*) as cantidad
FROM course_content_chunks
WHERE metadata->>'material_id' = '79882510-d16f-447b-802a-1f73cdce1c04'
GROUP BY (embedding IS NOT NULL);

-- Ver algunos chunks de ejemplo del Tomo 1
SELECT 
    id,
    left(content, 150) as preview,
    (embedding IS NOT NULL) as tiene_embedding,
    metadata->>'pageStart' as pagina_inicio,
    metadata->>'pageEnd' as pagina_fin
FROM course_content_chunks
WHERE metadata->>'material_id' = '6a695969-78c1-42ea-af24-f6f2e2f88332'
ORDER BY (metadata->>'pageStart')::int NULLS LAST
LIMIT 5;
