-- 09_add_title_description_to_course_modules.sql
-- Agregar campos title y description a la tabla course_modules

-- Verificar si existen las columnas y agregarlas si no existen
DO $$
BEGIN
  -- Agregar columna title si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.course_modules ADD COLUMN title text;
    
    -- Si la columna name tiene datos, copiar a title
    UPDATE public.course_modules SET title = name WHERE title IS NULL;
    
    -- Hacer title NOT NULL después de migrar datos
    ALTER TABLE public.course_modules ALTER COLUMN title SET NOT NULL;
  END IF;
  
  -- Agregar columna description si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.course_modules ADD COLUMN description text;
  END IF;
  
  -- Comentarios para documentación
  COMMENT ON COLUMN public.course_modules.title IS 'Título del módulo';
  COMMENT ON COLUMN public.course_modules.description IS 'Descripción detallada del módulo';
END $$;

-- Verificar los cambios
DO $$
BEGIN
  RAISE NOTICE 'Verificando estructura de course_modules...';
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'title'
  ) THEN
    RAISE NOTICE '✓ Columna title agregada exitosamente';
  ELSE
    RAISE NOTICE '✗ ERROR: No se pudo agregar la columna title';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'course_modules' AND column_name = 'description'
  ) THEN
    RAISE NOTICE '✓ Columna description agregada exitosamente';
  ELSE
    RAISE NOTICE '✗ ERROR: No se pudo agregar la columna description';
  END IF;
END $$;

