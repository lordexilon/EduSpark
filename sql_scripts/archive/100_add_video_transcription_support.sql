-- 100_add_video_transcription_support.sql
-- Script para agregar soporte de transcripciones de videos y tracking de progreso

-- =====================================================
-- MODIFICAR TABLA materials PARA SOPORTAR TRANSCRIPCIONES
-- =====================================================

-- Agregar columnas para transcripciones y metadatos de video
DO $$
BEGIN
  -- Agregar columna transcription si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'transcription'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN transcription TEXT;
  END IF;

  -- Agregar columna transcription_status si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'transcription_status'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN transcription_status VARCHAR(50) DEFAULT 'pending';
    -- Valores: pending, processing, completed, failed
  END IF;

  -- Agregar columna video_platform si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'video_platform'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN video_platform VARCHAR(50);
    -- Valores: youtube, vimeo, other
  END IF;

  -- Agregar columna video_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'video_id'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN video_id VARCHAR(255);
  END IF;

  -- Agregar columna video_duration si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'video_duration'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN video_duration INTEGER;
    -- Duración en segundos
  END IF;

  -- Agregar columna transcription_metadata si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'transcription_metadata'
  ) THEN
    ALTER TABLE public.materials ADD COLUMN transcription_metadata JSONB DEFAULT '{}'::jsonb;
    -- Metadatos: idioma, fecha extracción, longitud, etc.
  END IF;
END $$;

-- Crear índices para búsqueda de transcripciones
CREATE INDEX IF NOT EXISTS idx_materials_transcription 
ON public.materials USING gin(to_tsvector('spanish', transcription))
WHERE transcription IS NOT NULL;

-- Índice para búsqueda por plataforma de video
CREATE INDEX IF NOT EXISTS idx_materials_video_platform 
ON public.materials(video_platform, video_id) 
WHERE video_platform IS NOT NULL;

-- Índice para búsqueda por estado de transcripción
CREATE INDEX IF NOT EXISTS idx_materials_transcription_status 
ON public.materials(transcription_status)
WHERE transcription_status IS NOT NULL;

-- =====================================================
-- CREAR TABLA PARA TRACKING DE PROGRESO DE VIDEOS
-- =====================================================

-- Detectar el tipo de datos de courses.id para compatibilidad
DO $$
DECLARE
  course_id_type TEXT;
BEGIN
  -- Detectar el tipo de datos de courses.id
  SELECT data_type INTO course_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'courses'
    AND column_name = 'id';
  
  -- Crear la tabla con el tipo correcto
  IF course_id_type = 'integer' THEN
    -- Usar INTEGER para course_id
    CREATE TABLE IF NOT EXISTS public.video_viewing_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
      unit_id UUID REFERENCES public.course_units(id) ON DELETE SET NULL,
      watched_seconds INTEGER DEFAULT 0,
      total_seconds INTEGER,
      completion_percentage DECIMAL(5,2) DEFAULT 0,
      last_position INTEGER DEFAULT 0, -- Última posición vista en segundos
      is_completed BOOLEAN DEFAULT false,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      last_watched_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(student_id, material_id)
    );
  ELSE
    -- Usar UUID para course_id (por defecto)
    CREATE TABLE IF NOT EXISTS public.video_viewing_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
      unit_id UUID REFERENCES public.course_units(id) ON DELETE SET NULL,
      watched_seconds INTEGER DEFAULT 0,
      total_seconds INTEGER,
      completion_percentage DECIMAL(5,2) DEFAULT 0,
      last_position INTEGER DEFAULT 0, -- Última posición vista en segundos
      is_completed BOOLEAN DEFAULT false,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      last_watched_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(student_id, material_id)
    );
  END IF;
END $$;

-- Crear índices para la tabla de progreso
CREATE INDEX IF NOT EXISTS idx_video_progress_student_material 
ON public.video_viewing_progress(student_id, material_id);

CREATE INDEX IF NOT EXISTS idx_video_progress_course_unit 
ON public.video_viewing_progress(course_id, unit_id);

CREATE INDEX IF NOT EXISTS idx_video_progress_student_course 
ON public.video_viewing_progress(student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_video_progress_completed 
ON public.video_viewing_progress(is_completed, last_watched_at)
WHERE is_completed = true;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_video_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_video_progress_updated_at ON public.video_viewing_progress;
CREATE TRIGGER trigger_update_video_progress_updated_at
BEFORE UPDATE ON public.video_viewing_progress
FOR EACH ROW
EXECUTE FUNCTION update_video_progress_updated_at();

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN public.materials.transcription IS 'Transcripción completa del video extraída automáticamente';
COMMENT ON COLUMN public.materials.transcription_status IS 'Estado del proceso de transcripción: pending, processing, completed, failed';
COMMENT ON COLUMN public.materials.video_platform IS 'Plataforma del video: youtube, vimeo, other';
COMMENT ON COLUMN public.materials.video_id IS 'ID del video en la plataforma correspondiente';
COMMENT ON COLUMN public.materials.video_duration IS 'Duración del video en segundos';
COMMENT ON COLUMN public.materials.transcription_metadata IS 'Metadatos de la transcripción: idioma, fecha extracción, longitud, etc.';

COMMENT ON TABLE public.video_viewing_progress IS 'Tracking del progreso de visualización de videos por estudiante';
COMMENT ON COLUMN public.video_viewing_progress.watched_seconds IS 'Total de segundos visualizados (puede ser mayor que total_seconds si se repite)';
COMMENT ON COLUMN public.video_viewing_progress.completion_percentage IS 'Porcentaje de completitud (0-100)';
COMMENT ON COLUMN public.video_viewing_progress.is_completed IS 'Indica si el video fue completado (>=90% visto)';

