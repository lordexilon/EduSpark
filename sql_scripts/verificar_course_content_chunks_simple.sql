-- Verificación rápida de course_content_chunks
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que la tabla existe
SELECT 
  'Tabla existe' as estado,
  COUNT(*) as columnas
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks';

-- 2. Ver todas las columnas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
ORDER BY ordinal_position;

-- 3. Verificar específicamente chunk_index
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'course_content_chunks'
      AND column_name = 'chunk_index'
    ) THEN '✅ chunk_index existe'
    ELSE '❌ chunk_index NO existe'
  END as estado_chunk_index;

-- 4. Verificar tipo de course_id
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'integer' THEN '✅ Correcto (INTEGER)'
    WHEN data_type = 'uuid' THEN '⚠️ Es UUID, debería ser INTEGER'
    ELSE '❓ Tipo desconocido: ' || data_type
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
  AND column_name = 'course_id';

-- 5. Contar registros (si hay alguno)
SELECT COUNT(*) as total_chunks FROM public.course_content_chunks;

