-- Verificar qué material tiene el ID que está devolviendo la búsqueda

SELECT 
    id,
    title,
    course_id,
    created_at
FROM materials
WHERE id = '6e8cea55-3ecc-4cdc-affa-9cffa1f2f036';

-- Ver si ese material menciona "Harrison" en su contenido
SELECT 
    COUNT(*) as chunks_que_mencionan_harrison
FROM course_content_chunks
WHERE metadata->>'material_id' = '6e8cea55-3ecc-4cdc-affa-9cffa1f2f036'
  AND content ILIKE '%harrison%';
