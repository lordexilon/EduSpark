-- Parte 2: Índice de Trigramas
-- Este índice es pesado. Ejecutar SOLO este script después del Parte 1.

-- 3. Crear índice para búsqueda por similitud de trigramas (para errores tipográficos)
DROP INDEX IF EXISTS idx_course_content_chunks_content_trgm;

CREATE INDEX idx_course_content_chunks_content_trgm 
ON course_content_chunks 
USING gin(content gin_trgm_ops);
