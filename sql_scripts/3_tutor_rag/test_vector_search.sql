-- Test simple de búsqueda vectorial
-- Usar un embedding de prueba para ver si la función funciona

-- 1. Obtener un embedding real de la BD para usarlo como query de prueba
WITH sample_embedding AS (
  SELECT embedding
  FROM course_content_chunks
  WHERE course_id = 12 
    AND embedding IS NOT NULL
  LIMIT 1
)
SELECT 
    id,
    left(content, 100) as preview,
    metadata->>'material_id' as material_id,
    1 - (ccc.embedding <=> se.embedding) as similarity
FROM course_content_chunks ccc, sample_embedding se
WHERE ccc.course_id = 12
  AND ccc.embedding IS NOT NULL
  AND 1 - (ccc.embedding <=> se.embedding) > 0.5
ORDER BY ccc.embedding <=> se.embedding
LIMIT 5;
