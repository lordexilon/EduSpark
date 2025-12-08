-- Ver todos los materiales del curso 12 y sus chunks

SELECT 
    m.id,
    m.title,
    COUNT(c.id) as chunk_count,
    MIN(c.metadata->>'pageStart') as min_page,
    MAX(c.metadata->>'pageEnd') as max_page
FROM materials m
LEFT JOIN course_content_chunks c ON c.metadata->>'material_id' = m.id::text
WHERE m.course_id = 12
GROUP BY m.id, m.title
ORDER BY chunk_count DESC;

-- Ver un chunk específico que tenga esos números raros
SELECT 
    id,
    metadata,
    left(content, 200) as preview
FROM course_content_chunks
WHERE course_id = 12
  AND (
    metadata->>'pageStart' LIKE '1132%'
    OR metadata->>'page_start' LIKE '1132%'
  )
LIMIT 3;
