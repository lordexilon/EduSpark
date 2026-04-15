-- Parte 1: Extensiones e Índice de Texto Completo (FTS)
-- Ejecutar este script primero. Si tarda mucho, es normal.

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear índice GIN para búsqueda de texto completo (FTS) en español
-- Usamos CONCURRENTLY para no bloquear la tabla, pero no se puede usar dentro de una transacción.
-- En Supabase Editor, simplemente ejecutamos el CREATE INDEX normal pero solo este.
DROP INDEX IF EXISTS idx_course_content_chunks_fts_spanish;

CREATE INDEX idx_course_content_chunks_fts_spanish 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));
