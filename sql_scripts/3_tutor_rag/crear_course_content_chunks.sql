-- Crear o verificar tabla course_content_chunks para RAG
-- Ejecutar en Supabase SQL Editor

-- 1. Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.course_content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768), -- Vector de 768 dimensiones para embeddings
  chunk_index INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Agregar columna chunk_index si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_content_chunks'
    AND column_name = 'chunk_index'
  ) THEN
    ALTER TABLE public.course_content_chunks 
    ADD COLUMN chunk_index INTEGER;
    
    RAISE NOTICE 'Columna chunk_index agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna chunk_index ya existe';
  END IF;
END $$;

-- 3. Agregar columna metadata si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_content_chunks'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.course_content_chunks 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE 'Columna metadata agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna metadata ya existe';
  END IF;
END $$;

-- 4. Verificar que course_id sea INTEGER (no UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_content_chunks'
    AND column_name = 'course_id'
    AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE 'ADVERTENCIA: course_id es UUID, pero el código espera INTEGER. Necesitas migrar los datos.';
  END IF;
END $$;

-- 5. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
  ON public.course_content_chunks(course_id);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_chunk_index 
  ON public.course_content_chunks(course_id, chunk_index);

-- 6. Crear índice vectorial para búsqueda semántica (si la extensión pgvector está instalada)
-- Nota: Esto puede fallar si pgvector no está instalado, pero no es crítico
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_extension WHERE extname = 'vector'
  ) THEN
    -- Verificar si el índice vectorial ya existe
    IF NOT EXISTS (
      SELECT FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'course_content_chunks'
      AND indexname LIKE '%embedding%'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_course_content_chunks_embedding 
        ON public.course_content_chunks 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      
      RAISE NOTICE 'Índice vectorial creado exitosamente';
    ELSE
      RAISE NOTICE 'El índice vectorial ya existe';
    END IF;
  ELSE
    RAISE NOTICE 'La extensión pgvector no está instalada. El índice vectorial no se creará.';
  END IF;
END $$;

-- 7. Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
ORDER BY ordinal_position;

-- 8. Verificar permisos RLS (Row Level Security)
-- Si RLS está habilitado, asegurarse de que las políticas permitan inserción
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'course_content_chunks';

