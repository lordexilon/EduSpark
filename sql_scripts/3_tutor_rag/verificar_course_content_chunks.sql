-- Verificar estructura de la tabla course_content_chunks
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si la tabla existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
) as table_exists;

-- 2. Ver todas las columnas de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
ORDER BY ordinal_position;

-- 3. Verificar si chunk_index existe
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
  AND column_name = 'chunk_index'
) as chunk_index_exists;

-- 4. Si la columna no existe, crearla
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

-- 5. Verificar estructura completa después
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
ORDER BY ordinal_position;

