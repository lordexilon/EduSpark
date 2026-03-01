-- Buscar específicamente chunks de Harrison
-- Script simple para encontrar el material_id de Harrison y ver sus chunks

-- 1. Encontrar el ID del material Harrison
SELECT id, title, created_at
FROM materials
WHERE title ILIKE '%Harrison%'
  AND course_id = 12
LIMIT 5;

-- 2. Ver chunks de Harrison (reemplaza 'MATERIAL_ID_AQUI' con el ID del paso 1)
-- SELECT 
--     id,
--     left(content, 150) as preview,
--     (embedding IS NOT NULL) as tiene_embedding,
--     metadata->>'pageStart' as pagina
-- FROM course_content_chunks
-- WHERE metadata->>'material_id' = 'MATERIAL_ID_AQUI'
-- LIMIT 5;

-- 3. Contar chunks de Harrison por estado de embedding
-- SELECT 
--     (embedding IS NOT NULL) as tiene_embedding,
--     COUNT(*) as cantidad
-- FROM course_content_chunks
-- WHERE metadata->>'material_id' = 'MATERIAL_ID_AQUI'
-- GROUP BY (embedding IS NOT NULL);
