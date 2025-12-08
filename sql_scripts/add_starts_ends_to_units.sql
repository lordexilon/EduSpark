-- Script para agregar campos de fecha de inicio/fin a unidades
-- Esto permite a los profesores definir el período en que se desarrolla cada unidad

-- =====================================================
-- Agregar campos de fecha a course_units
-- =====================================================

DO $$ 
BEGIN
  -- Agregar starts_at a course_units
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_units' 
    AND column_name = 'starts_at'
  ) THEN
    ALTER TABLE public.course_units 
    ADD COLUMN starts_at TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.course_units.starts_at IS 'Fecha/hora de inicio de la unidad (cuándo empieza)';
    
    RAISE NOTICE '✅ Columna starts_at agregada a course_units';
  ELSE
    RAISE NOTICE 'ℹ️ La columna starts_at ya existe en course_units';
  END IF;

  -- Agregar ends_at a course_units
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_units' 
    AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE public.course_units 
    ADD COLUMN ends_at TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.course_units.ends_at IS 'Fecha/hora de fin de la unidad (cuándo termina)';
    
    RAISE NOTICE '✅ Columna ends_at agregada a course_units';
  ELSE
    RAISE NOTICE 'ℹ️ La columna ends_at ya existe en course_units';
  END IF;
END $$;

-- Agregar constraint para validar que ends_at >= starts_at
ALTER TABLE public.course_units 
DROP CONSTRAINT IF EXISTS valid_unit_period_dates;

ALTER TABLE public.course_units
ADD CONSTRAINT valid_unit_period_dates 
CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at);

COMMENT ON CONSTRAINT valid_unit_period_dates ON public.course_units IS 
'Asegura que la fecha de fin sea posterior o igual a la fecha de inicio de la unidad';

DO $$ 
BEGIN
  RAISE NOTICE '===================================================';
  RAISE NOTICE '✅ Script completado exitosamente';
  RAISE NOTICE '===================================================';
  RAISE NOTICE 'Cambios realizados:';
  RAISE NOTICE '- Agregadas columnas starts_at y ends_at a course_units';
  RAISE NOTICE '- Agregado constraint de validación de fechas';
  RAISE NOTICE '===================================================';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Diferencia entre campos:';
  RAISE NOTICE '   starts_at/ends_at: Cuándo empieza y termina la unidad';
  RAISE NOTICE '   available_from/available_until: Cuándo los estudiantes pueden acceder';
  RAISE NOTICE '===================================================';
END $$;
