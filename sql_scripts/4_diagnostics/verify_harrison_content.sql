-- Verificar si hay chunks de Harrison que contengan palabras clave médicas comunes
-- Esto nos dirá si Harrison realmente tiene contenido útil indexado

SELECT 
    'Chunks de Harrison que hablan de hipertensión' as descripcion,
    COUNT(*) as cantidad
FROM course_content_chunks
WHERE metadata->>'material_id' IN (
    '6a695969-78c1-42ea-af24-f6f2e2f88332',  -- Tomo 1
    '79882510-d16f-447b-802a-1f73cdce1c04'   -- Tomo 2
)
AND (
    content ILIKE '%hipertens%' 
    OR content ILIKE '%presión arterial%'
    OR content ILIKE '%blood pressure%'
);

-- Ver algunos ejemplos
SELECT 
    left(content, 200) as preview,
    (embedding IS NOT NULL) as tiene_embedding,
    metadata->>'pageStart' as pagina
FROM course_content_chunks
WHERE metadata->>'material_id' IN (
    '6a695969-78c1-42ea-af24-f6f2e2f88332',
    '79882510-d16f-447b-802a-1f73cdce1c04'
)
AND content ILIKE '%hipertens%'
LIMIT 3;
