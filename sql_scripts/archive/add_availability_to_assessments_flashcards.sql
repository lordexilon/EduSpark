-- Script para agregar campos de disponibilidad por fecha a assessments y flashcards
-- Esto permite controlar cuándo los estudiantes pueden acceder a quizzes y flashcards

-- =====================================================
-- Agregar campos de disponibilidad a assessments (quizzes)
-- =====================================================

DO $$ 
BEGIN
  -- Agregar available_from a assessments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assessments' 
    AND column_name = 'available_from'
  ) THEN
    ALTER TABLE public.assessments 
    ADD COLUMN available_from TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.assessments.available_from IS 'Fecha desde la cual el quiz está disponible para estudiantes';
    
    RAISE NOTICE '✅ Columna available_from agregada a assessments';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_from ya existe en assessments';
  END IF;

  -- Agregar available_until a assessments  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assessments' 
    AND column_name = 'available_until'
  ) THEN
    ALTER TABLE public.assessments 
    ADD COLUMN available_until TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.assessments.available_until IS 'Fecha hasta la cual el quiz está disponible para estudiantes';
    
    RAISE NOTICE '✅ Columna available_until agregada a assessments';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_until ya existe en assessments';
  END IF;
END $$;

-- Agregar constraint para validar fechas de assessments
ALTER TABLE public.assessments 
DROP CONSTRAINT IF EXISTS valid_assessment_dates;

ALTER TABLE public.assessments
ADD CONSTRAINT valid_assessment_dates 
CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from);

COMMENT ON CONSTRAINT valid_assessment_dates ON public.assessments IS 
'Asegura que la fecha de fin sea posterior o igual a la fecha de inicio del quiz';

-- =====================================================
-- Agregar campos de disponibilidad a flashcards
-- =====================================================

DO $$ 
BEGIN
  -- Agregar available_from a flashcards
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'flashcards' 
    AND column_name = 'available_from'
  ) THEN
    ALTER TABLE public.flashcards 
    ADD COLUMN available_from TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.flashcards.available_from IS 'Fecha desde la cual la flashcard está disponible para estudiantes';
    
    RAISE NOTICE '✅ Columna available_from agregada a flashcards';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_from ya existe en flashcards';
  END IF;

  -- Agregar available_until a flashcards
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'flashcards' 
    AND column_name = 'available_until'
  ) THEN
    ALTER TABLE public.flashcards 
    ADD COLUMN available_until TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.flashcards.available_until IS 'Fecha hasta la cual la flashcard está disponible para estudiantes';
    
    RAISE NOTICE '✅ Columna available_until agregada a flashcards';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_until ya existe en flashcards';
  END IF;
END $$;

-- Agregar constraint para validar fechas de flashcards
ALTER TABLE public.flashcards 
DROP CONSTRAINT IF EXISTS valid_flashcard_dates;

ALTER TABLE public.flashcards
ADD CONSTRAINT valid_flashcard_dates 
CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from);

COMMENT ON CONSTRAINT valid_flashcard_dates ON public.flashcards IS 
'Asegura que la fecha de fin sea posterior o igual a la fecha de inicio de la flashcard';

-- =====================================================
-- Crear índices para mejorar consultas de disponibilidad
-- =====================================================

-- Índice para consultas de disponibilidad de assessments
CREATE INDEX IF NOT EXISTS idx_assessments_availability 
ON public.assessments(available_from, available_until) 
WHERE available_from IS NOT NULL OR available_until IS NOT NULL;

-- Índice para consultas de disponibilidad de flashcards
CREATE INDEX IF NOT EXISTS idx_flashcards_availability 
ON public.flashcards(available_from, available_until) 
WHERE available_from IS NOT NULL OR available_until IS NOT NULL;

-- =====================================================
-- Resumen
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '===================================================';
  RAISE NOTICE '✅ Script completado exitosamente';
  RAISE NOTICE '===================================================';
  RAISE NOTICE 'Cambios realizados:';
  RAISE NOTICE '- Agregadas columnas available_from y available_until a assessments';
  RAISE NOTICE '- Agregadas columnas available_from y available_until a flashcards';
  RAISE NOTICE '- Creados constraints de validación de fechas';
  RAISE NOTICE '- Agregados índices para mejorar rendimiento';
  RAISE NOTICE '===================================================';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Uso:';
  RAISE NOTICE '   - Si no se configuran fechas, el contenido está siempre disponible';
  RAISE NOTICE '   - available_from: fecha desde la cual está disponible';
  RAISE NOTICE '   - available_until: fecha hasta la cual está disponible';
  RAISE NOTICE '===================================================';
END $$;
