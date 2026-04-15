-- Script para agregar campos de disponibilidad por fecha a unidades y sesiones
-- Esto permite controlar cuándo los estudiantes pueden acceder a cada unidad/sesión

-- =====================================================
-- 1. Agregar campos de fecha a course_units
-- =====================================================

DO $$ 
BEGIN
  -- Agregar available_from a course_units
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_units' 
    AND column_name = 'available_from'
  ) THEN
    ALTER TABLE public.course_units 
    ADD COLUMN available_from TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.course_units.available_from IS 'Fecha/hora desde la cual la unidad estará disponible para los estudiantes';
    
    RAISE NOTICE '✅ Columna available_from agregada a course_units';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_from ya existe en course_units';
  END IF;

  -- Agregar available_until a course_units
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'course_units' 
    AND column_name = 'available_until'
  ) THEN
    ALTER TABLE public.course_units 
    ADD COLUMN available_until TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.course_units.available_until IS 'Fecha/hora hasta la cual la unidad estará disponible para los estudiantes';
    
    RAISE NOTICE '✅ Columna available_until agregada a course_units';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_until ya existe en course_units';
  END IF;
END $$;

-- Agregar constraint para validar que available_until >= available_from
ALTER TABLE public.course_units 
DROP CONSTRAINT IF EXISTS valid_unit_dates;

ALTER TABLE public.course_units
ADD CONSTRAINT valid_unit_dates 
CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from);

-- =====================================================
-- 2. Agregar campos de fecha a sessions
-- =====================================================

DO $$ 
BEGIN
  -- Agregar available_from a sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sessions' 
    AND column_name = 'available_from'
  ) THEN
    ALTER TABLE public.sessions 
    ADD COLUMN available_from TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.sessions.available_from IS 'Fecha/hora desde la cual la sesión estará disponible para los estudiantes';
    
    RAISE NOTICE '✅ Columna available_from agregada a sessions';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_from ya existe en sessions';
  END IF;

  -- Agregar available_until a sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sessions' 
    AND column_name = 'available_until'
  ) THEN
    ALTER TABLE public.sessions 
    ADD COLUMN available_until TIMESTAMPTZ DEFAULT NULL;
    
    COMMENT ON COLUMN public.sessions.available_until IS 'Fecha/hora hasta la cual la sesión estará disponible para los estudiantes';
    
    RAISE NOTICE '✅ Columna available_until agregada a sessions';
  ELSE
    RAISE NOTICE 'ℹ️ La columna available_until ya existe en sessions';
  END IF;
END $$;

-- Agregar constraint para validar que available_until >= available_from
ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS valid_session_dates;

ALTER TABLE public.sessions
ADD CONSTRAINT valid_session_dates 
CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from);

-- =====================================================
-- 3. Crear función helper para verificar disponibilidad
-- =====================================================

CREATE OR REPLACE FUNCTION is_unit_available_for_student(
  p_unit_id TEXT,
  p_student_id TEXT DEFAULT NULL,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
  v_available_from TIMESTAMPTZ;
  v_available_until TIMESTAMPTZ;
BEGIN
  -- Obtener fechas de disponibilidad de la unidad
  SELECT available_from, available_until 
  INTO v_available_from, v_available_until
  FROM course_units 
  WHERE id = p_unit_id;
  
  -- Si no hay fechas configuradas, la unidad está disponible
  IF v_available_from IS NULL AND v_available_until IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si está dentro del rango de fechas
  IF v_available_from IS NOT NULL AND p_check_time < v_available_from THEN
    RETURN FALSE;
  END IF;
  
  IF v_available_until IS NOT NULL AND p_check_time > v_available_until THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_session_available_for_student(
  p_session_id TEXT,
  p_student_id TEXT DEFAULT NULL,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
  v_available_from TIMESTAMPTZ;
  v_available_until TIMESTAMPTZ;
  v_unit_id TEXT;
  v_unit_available BOOLEAN;
BEGIN
  -- Obtener fechas de disponibilidad de la sesión y su unidad
  SELECT 
    s.available_from, 
    s.available_until,
    s.unit_id
  INTO v_available_from, v_available_until, v_unit_id
  FROM sessions s 
  WHERE s.id = p_session_id;
  
  -- Verificar disponibilidad de la unidad padre primero
  IF v_unit_id IS NOT NULL THEN
    v_unit_available := is_unit_available_for_student(v_unit_id, p_student_id, p_check_time);
    IF NOT v_unit_available THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Si no hay fechas configuradas en la sesión, heredar disponibilidad de la unidad
  IF v_available_from IS NULL AND v_available_until IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si está dentro del rango de fechas de la sesión
  IF v_available_from IS NOT NULL AND p_check_time < v_available_from THEN
    RETURN FALSE;
  END IF;
  
  IF v_available_until IS NOT NULL AND p_check_time > v_available_until THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices para mejorar rendimiento de consultas de disponibilidad
CREATE INDEX IF NOT EXISTS idx_course_units_availability 
ON public.course_units(available_from, available_until) 
WHERE available_from IS NOT NULL OR available_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_availability 
ON public.sessions(available_from, available_until) 
WHERE available_from IS NOT NULL OR available_until IS NOT NULL;

-- =====================================================
-- 4. Comentarios y documentación
-- =====================================================

COMMENT ON CONSTRAINT valid_unit_dates ON public.course_units IS 
'Asegura que la fecha de fin sea posterior o igual a la fecha de inicio';

COMMENT ON CONSTRAINT valid_session_dates ON public.sessions IS 
'Asegura que la fecha de fin sea posterior o igual a la fecha de inicio';

COMMENT ON FUNCTION is_unit_available_for_student IS 
'Verifica si una unidad está disponible para un estudiante en un momento dado basándose en las fechas configuradas';

COMMENT ON FUNCTION is_session_available_for_student IS 
'Verifica si una sesión está disponible para un estudiante en un momento dado basándose en las fechas de la sesión y su unidad padre';

-- =====================================================
-- Finalización
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '===================================================';
  RAISE NOTICE '✅ Script completado exitosamente';
  RAISE NOTICE '===================================================';
  RAISE NOTICE 'Cambios realizados:';
  RAISE NOTICE '- Agregadas columnas available_from y available_until a course_units';
  RAISE NOTICE '- Agregadas columnas available_from y available_until a sessions';
  RAISE NOTICE '- Creadas funciones helper: is_unit_available_for_student y is_session_available_for_student';
  RAISE NOTICE '- Agregados índices para mejorar rendimiento de consultas de disponibilidad';
  RAISE NOTICE '===================================================';
END $$;
