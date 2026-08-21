-- Optimización de búsqueda vectorial para materiales del curso
-- Fecha: 2026-02-16
-- Descripción: Implementación de índice HNSW para mejorar rendimiento en búsquedas RAG
-- CORRECCIÓN: Tabla correcta es 'course_content_chunks', no 'course_materials_vectors'

-- Habilitar extensión vector si no existe
CREATE EXTENSION IF NOT EXISTS vector;

-- Eliminar índice anterior si existe para evitar conflictos
DROP INDEX IF EXISTS course_content_chunks_embedding_hnsw;

-- Crear índice HNSW en la columna 'embedding' de 'course_content_chunks'
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_content_chunks') THEN
    CREATE INDEX IF NOT EXISTS course_content_chunks_embedding_hnsw 
    ON course_content_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
  END IF;
END $$;

-- Comentario explicativo
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'course_content_chunks_embedding_hnsw') THEN
    COMMENT ON INDEX course_content_chunks_embedding_hnsw IS 'Índice HNSW para búsqueda rápida de similitud coseno en RAG';
  END IF;
END $$;
