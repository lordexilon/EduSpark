-- 88_add_google_meet_to_sessions.sql
-- Agregar campos para integración con Google Calendar y Google Meet

-- Agregar columna google_meet_link si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'google_meet_link'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN google_meet_link TEXT;
    END IF;
END $$;

-- Agregar columna google_calendar_event_id si no existe (para tracking del evento en Calendar)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'google_calendar_event_id'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN google_calendar_event_id TEXT;
    END IF;
END $$;

-- Agregar columna google_meet_recording_url si no existe (para almacenar grabaciones)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'google_meet_recording_url'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN google_meet_recording_url TEXT;
    END IF;
END $$;

-- Agregar columna auto_create_meet si no existe (opción para crear automáticamente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'auto_create_meet'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN auto_create_meet BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Crear índice para búsqueda por google_calendar_event_id
CREATE INDEX IF NOT EXISTS idx_sessions_google_calendar_event_id 
ON public.sessions(google_calendar_event_id) 
WHERE google_calendar_event_id IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.sessions.google_meet_link IS 'Enlace de Google Meet para la sesión sincrónica';
COMMENT ON COLUMN public.sessions.google_calendar_event_id IS 'ID del evento en Google Calendar (para gestión avanzada)';
COMMENT ON COLUMN public.sessions.google_meet_recording_url IS 'URL de la grabación de la sesión (si está disponible)';
COMMENT ON COLUMN public.sessions.auto_create_meet IS 'Indica si se debe crear automáticamente el Meet al crear la sesión';
