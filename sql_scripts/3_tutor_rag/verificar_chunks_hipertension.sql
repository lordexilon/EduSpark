-- Verificar si existen chunks sobre hipertensión en Harrison

SELECT 
    id,
    left(content, 200) as preview,
    metadata->>'pageStart' as page_start,
    metadata->>'pageEnd' as page_end,
    metadata->>'material_title' as material
FROM course_content_chunks
WHERE metadata->>'material_id' IN (
    '6a695969-78c1-42ea-af24-f6f2e2f88332',
    '79882510-d16f-447b-802a-1f73cdce1c04'
)
AND (
    content ILIKE '%hipertens%' 
    OR content ILIKE '%hiperten%'
    OR content ILIKE '%hypertens%'
    OR content ILIKE '%presión%'
    OR content ILIKE '%presion%'
)
LIMIT 10;
