-- Verificar qué metadata tienen los chunks de Schwartz que muestran páginas incorrectas

SELECT 
    id,
    metadata->>'pageStart' as page_start_camel,
    metadata->>'page_start' as page_start_snake,
    metadata->>'pageEnd' as page_end_camel,
    metadata->>'page_end' as page_end_snake,
    metadata->>'material_title' as material,
    left(content, 100) as preview
FROM course_content_chunks
WHERE metadata->>'material_title' ILIKE '%schwartz%'
  AND course_id = 12
LIMIT 5;
