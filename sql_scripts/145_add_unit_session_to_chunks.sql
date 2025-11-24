-- Script para agregar columnas unit_id y session_id a course_content_chunks
-- Esto permite vincular los chunks procesados con las unidades y sesiones del curso
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna unit_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_content_chunks'
    AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE public.course_content_chunks 
    ADD COLUMN unit_id UUID REFERENCES public.course_units(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Columna unit_id agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna unit_id ya existe';
  END IF;
END $$;

-- 2. Agregar columna session_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_content_chunks'
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.course_content_chunks 
    ADD COLUMN session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Columna session_id agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna session_id ya existe';
  END IF;
END $$;

-- 3. Crear índices para mejorar el rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_unit_id 
  ON public.course_content_chunks(unit_id);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_session_id 
  ON public.course_content_chunks(session_id);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_unit 
  ON public.course_content_chunks(course_id, unit_id);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_session 
  ON public.course_content_chunks(course_id, session_id);

-- 4. Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
ORDER BY ordinal_position;

