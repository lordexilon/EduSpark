-- 76_add_videocall_fields.sql
-- Agregar campos para gestionar videollamadas con Google Meet

-- Agregar campos a la tabla sessions si no existen
DO $$
BEGIN
    -- Campo para almacenar el enlace de Google Meet
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'meet_link'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN meet_link TEXT;
    END IF;

    -- Campo para almacenar el ID del evento de Google Calendar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'calendar_event_id'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN calendar_event_id TEXT;
    END IF;

    -- Campo para almacenar la URL del evento de Google Calendar
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'calendar_event_url'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN calendar_event_url TEXT;
    END IF;

    -- Campo para indicar si la videollamada está programada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'has_videocall'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN has_videocall BOOLEAN DEFAULT FALSE;
    END IF;

    -- Campo para almacenar información adicional de la videollamada (recording, participants, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'videocall_metadata'
    ) THEN
        ALTER TABLE public.sessions ADD COLUMN videocall_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Crear índice para búsquedas por calendar_event_id
CREATE INDEX IF NOT EXISTS idx_sessions_calendar_event_id ON public.sessions(calendar_event_id) WHERE calendar_event_id IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.sessions.meet_link IS 'Enlace único de Google Meet para la videollamada';
COMMENT ON COLUMN public.sessions.calendar_event_id IS 'ID del evento creado en Google Calendar';
COMMENT ON COLUMN public.sessions.calendar_event_url IS 'URL del evento en Google Calendar';
COMMENT ON COLUMN public.sessions.has_videocall IS 'Indica si la sesión tiene una videollamada programada';
COMMENT ON COLUMN public.sessions.videocall_metadata IS 'Metadatos adicionales: recording_url, participant_count, etc.';
