-- Corregir tipo de course_id de TEXT a INTEGER
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar el tipo actual y datos existentes
SELECT 
  'Tipo actual' as info,
  data_type,
  COUNT(*) as registros_con_course_id
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
  AND column_name = 'course_id'
GROUP BY data_type;

-- Verificar si hay registros y sus valores de course_id
SELECT 
  course_id,
  COUNT(*) as cantidad
FROM public.course_content_chunks
GROUP BY course_id;

-- 2. Verificar que todos los course_id sean convertibles a INTEGER
SELECT 
  course_id,
  CASE 
    WHEN course_id ~ '^[0-9]+$' THEN '✅ Convertible a INTEGER'
    ELSE '❌ NO convertible a INTEGER'
  END as puede_convertir
FROM public.course_content_chunks
GROUP BY course_id;

-- 3. Si todos son convertibles, hacer la conversión
-- IMPORTANTE: Esto eliminará los datos existentes si hay algún problema
-- Hacer backup primero si es necesario

-- Opción A: Si NO hay datos importantes, recrear la columna
DO $$
BEGIN
  -- Verificar si hay registros
  IF (SELECT COUNT(*) FROM public.course_content_chunks) = 0 THEN
    -- Si no hay datos, simplemente cambiar el tipo
    ALTER TABLE public.course_content_chunks 
    ALTER COLUMN course_id TYPE INTEGER USING course_id::INTEGER;
    
    RAISE NOTICE 'Columna course_id cambiada a INTEGER exitosamente';
  ELSE
    -- Si hay datos, verificar que todos sean convertibles
    IF NOT EXISTS (
      SELECT FROM public.course_content_chunks 
      WHERE course_id !~ '^[0-9]+$'
    ) THEN
      -- Todos son convertibles, hacer la conversión
      ALTER TABLE public.course_content_chunks 
      ALTER COLUMN course_id TYPE INTEGER USING course_id::INTEGER;
      
      RAISE NOTICE 'Columna course_id cambiada a INTEGER exitosamente (con datos)';
    ELSE
      RAISE EXCEPTION 'Hay valores de course_id que no son convertibles a INTEGER. Revisa los datos primero.';
    END IF;
  END IF;
END $$;

-- 4. Verificar el cambio
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'integer' THEN '✅ Correcto (INTEGER)'
    WHEN data_type = 'text' THEN '❌ Todavía es TEXT'
    ELSE '❓ Tipo: ' || data_type
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_content_chunks'
  AND column_name = 'course_id';

-- 5. Verificar que la foreign key sigue funcionando
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.course_content_chunks'::regclass
  AND conname LIKE '%course_id%';

