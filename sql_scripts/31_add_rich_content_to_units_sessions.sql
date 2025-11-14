-- 31_add_rich_content_to_units_sessions.sql
-- Agregar soporte para contenido didáctico rico (imágenes, videos, formato) en Unidades y Sesiones
-- Esto permite crear contenido más visual y didáctico directamente en las unidades y sesiones

-- =====================================================
-- MEJORAS PARA COURSE_UNITS (Unidades)
-- =====================================================

-- Contenido enriquecido (HTML y Markdown para flexibilidad)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'course_units' AND column_name = 'content_html') THEN
    ALTER TABLE public.course_units ADD COLUMN content_html TEXT;
    COMMENT ON COLUMN public.course_units.content_html IS 'Contenido didáctico en formato HTML (permite imágenes, videos, formato enriquecido)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'course_units' AND column_name = 'content_markdown') THEN
    ALTER TABLE public.course_units ADD COLUMN content_markdown TEXT;
    COMMENT ON COLUMN public.course_units.content_markdown IS 'Contenido didáctico en formato Markdown (alternativa al HTML)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'course_units' AND column_name = 'learning_objectives') THEN
    ALTER TABLE public.course_units ADD COLUMN learning_objectives TEXT[];
    COMMENT ON COLUMN public.course_units.learning_objectives IS 'Objetivos de aprendizaje de la unidad (array de textos)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'course_units' AND column_name = 'duration_hours') THEN
    ALTER TABLE public.course_units ADD COLUMN duration_hours DECIMAL(5,2);
    COMMENT ON COLUMN public.course_units.duration_hours IS 'Duración estimada de la unidad en horas';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'course_units' AND column_name = 'order_index') THEN
    ALTER TABLE public.course_units ADD COLUMN order_index INTEGER;
    COMMENT ON COLUMN public.course_units.order_index IS 'Orden de visualización (permite reordenar sin cambiar number)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'course_units' AND column_name = 'thumbnail_url') THEN
    ALTER TABLE public.course_units ADD COLUMN thumbnail_url TEXT;
    COMMENT ON COLUMN public.course_units.thumbnail_url IS 'URL de imagen representativa de la unidad';
  END IF;
END $$;

-- Actualizar order_index con el valor de number si está vacío
UPDATE public.course_units 
SET order_index = number 
WHERE order_index IS NULL;

-- =====================================================
-- MEJORAS PARA SESSIONS (Sesiones)
-- =====================================================

-- Contenido enriquecido para sesiones
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'content_html') THEN
    ALTER TABLE public.sessions ADD COLUMN content_html TEXT;
    COMMENT ON COLUMN public.sessions.content_html IS 'Contenido didáctico de la sesión en formato HTML (permite imágenes, videos, formato enriquecido)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'content_markdown') THEN
    ALTER TABLE public.sessions ADD COLUMN content_markdown TEXT;
    COMMENT ON COLUMN public.sessions.content_markdown IS 'Contenido didáctico de la sesión en formato Markdown (alternativa al HTML)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'learning_objectives') THEN
    ALTER TABLE public.sessions ADD COLUMN learning_objectives TEXT[];
    COMMENT ON COLUMN public.sessions.learning_objectives IS 'Objetivos de aprendizaje específicos de la sesión';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'activities') THEN
    ALTER TABLE public.sessions ADD COLUMN activities JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN public.sessions.activities IS 'Actividades de la sesión (ejercicios, prácticas, evaluaciones) en formato JSON';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'resources') THEN
    ALTER TABLE public.sessions ADD COLUMN resources JSONB DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN public.sessions.resources IS 'Recursos multimedia de la sesión (videos, imágenes, enlaces) en formato JSON';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'duration_minutes') THEN
    ALTER TABLE public.sessions ADD COLUMN duration_minutes INTEGER;
    COMMENT ON COLUMN public.sessions.duration_minutes IS 'Duración estimada de la sesión en minutos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'order_index') THEN
    ALTER TABLE public.sessions ADD COLUMN order_index INTEGER;
    COMMENT ON COLUMN public.sessions.order_index IS 'Orden de visualización dentro de la unidad';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'session_type') THEN
    ALTER TABLE public.sessions ADD COLUMN session_type VARCHAR(50) DEFAULT 'lecture';
    COMMENT ON COLUMN public.sessions.session_type IS 'Tipo de sesión: lecture, practice, lab, exam, discussion, etc.';
  END IF;
END $$;

-- =====================================================
-- ÍNDICES ADICIONALES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_course_units_order ON public.course_units(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_sessions_order ON public.sessions(unit_id, order_index) WHERE unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_type ON public.sessions(session_type);

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

COMMENT ON TABLE public.course_units IS 'Unidades temáticas del curso. Ahora soportan contenido HTML/Markdown rico con imágenes y videos.';
COMMENT ON TABLE public.sessions IS 'Sesiones/clases individuales. Soportan contenido didáctico rico, actividades y recursos multimedia.';

-- Verificación
DO $$
DECLARE
  units_rich_content BOOLEAN;
  sessions_rich_content BOOLEAN;
BEGIN
  -- Verificar course_units
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'course_units' AND column_name = 'content_html'
  ) INTO units_rich_content;

  -- Verificar sessions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'content_html'
  ) INTO sessions_rich_content;

  RAISE NOTICE 'course_units con contenido rico: %', CASE WHEN units_rich_content THEN '✓' ELSE '✗' END;
  RAISE NOTICE 'sessions con contenido rico: %', CASE WHEN sessions_rich_content THEN '✓' ELSE '✗' END;
END $$;

