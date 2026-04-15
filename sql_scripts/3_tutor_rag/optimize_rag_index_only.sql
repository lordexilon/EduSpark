-- Paso 2: Crear el índice de forma aislada
-- Ejecutar este script SOLO después del Paso 1.
-- Si falla por timeout, NO ES CRÍTICO, el sistema usará búsqueda vectorial.

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_fts_simple_v2
ON course_content_chunks 
USING gin(to_tsvector('simple', content));
