-- Diagnóstico de Chunks y Embeddings para Harrison
-- Verificar si tenemos embeddings y cómo se ve el texto

SELECT 
    id, 
    left(content, 100) as preview, 
    (embedding IS NOT NULL) as tiene_embedding, 
    metadata->>'pageStart' as pagina
FROM course_content_chunks 
WHERE content ILIKE '%hipertensi%' 
LIMIT 5;

-- Verificar configuración de búsqueda de texto
SELECT 
    to_tsvector('simple', 'Hipertensión') @@ to_tsquery('simple', 'hipertension') as match_sin_tilde,
    to_tsvector('spanish', 'Hipertensión') @@ to_tsquery('spanish', 'hipertension') as match_spanish;
