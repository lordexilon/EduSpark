-- 42_add_updated_at_to_course_units.sql
-- Agregar columna updated_at a course_units si no existe
-- Esta columna es necesaria para la función RPC update_unit_learning_objectives

-- Agregar updated_at a course_units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'course_units' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.course_units 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    COMMENT ON COLUMN public.course_units.updated_at IS 'Fecha y hora de última actualización de la unidad';
    
    -- Actualizar todos los registros existentes con la fecha actual
    UPDATE public.course_units 
    SET updated_at = created_at 
    WHERE updated_at IS NULL;
    
    RAISE NOTICE '✅ Columna updated_at agregada a course_units';
  ELSE
    RAISE NOTICE 'ℹ️ La columna updated_at ya existe en course_units';
  END IF;
END $$;

-- Crear trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trigger_course_units_updated_at ON public.course_units;

CREATE TRIGGER trigger_course_units_updated_at
  BEFORE UPDATE ON public.course_units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verificación
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'course_units'
  AND column_name = 'updated_at';

DO $$
BEGIN
  RAISE NOTICE '✅ Script completado. La columna updated_at está disponible en course_units.';
  RAISE NOTICE '✅ Trigger creado para actualizar updated_at automáticamente.';
END $$;

