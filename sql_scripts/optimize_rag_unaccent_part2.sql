-- Parte 2: Índice (Lento/Pesado)
-- Ejecutar después de la Parte 1.
-- Si da timeout, NO ES CRÍTICO. El sistema funcionará (quizás un poco más lento en búsqueda de texto, pero tiene fallback vectorial).

SET statement_timeout = 300000; -- Intentar dar 5 minutos

-- Borrar índices viejos para ahorrar espacio y evitar conflictos
DROP INDEX IF EXISTS idx_course_content_chunks_fts_spanish;
DROP INDEX IF EXISTS idx_course_content_chunks_fts_simple;
DROP INDEX IF EXISTS idx_course_content_chunks_fts_simple_v2;

-- Crear el nuevo índice
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_fts_unaccent
ON course_content_chunks 
USING gin(to_tsvector('spanish_unaccent', content));
