-- Script diagnóstico SIMPLE: Verificar embeddings
-- Esto NO debería dar timeout (es una consulta muy simple)

SELECT 
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_con_embedding,
    COUNT(*) - COUNT(embedding) as chunks_sin_embedding
FROM course_content_chunks
WHERE course_id = 12;

-- Ver un ejemplo de chunk de Harrison
SELECT 
    id,
    left(content, 100) as preview,
    (embedding IS NOT NULL) as tiene_embedding,
    metadata->>'material_id' as material_id,
    metadata->>'pageStart' as pagina
FROM course_content_chunks
WHERE course_id = 12
LIMIT 3;
