-- 96_add_google_drive_to_users.sql
-- Agregar campos para vincular Google Drive a usuarios

-- Agregar columnas para Google Drive en la tabla users
DO $$
BEGIN
  -- Carpeta de Drive del usuario (ID de la carpeta)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_drive_folder_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN google_drive_folder_id TEXT;
  END IF;

  -- URL de la carpeta de Drive
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_drive_folder_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN google_drive_folder_url TEXT;
  END IF;

  -- Nombre de la carpeta de Drive
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_drive_folder_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN google_drive_folder_name TEXT;
  END IF;

  -- Fecha de vinculación
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_drive_linked_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN google_drive_linked_at TIMESTAMPTZ;
  END IF;
END $$;

-- Índice para búsqueda rápida por carpeta de Drive
CREATE INDEX IF NOT EXISTS idx_users_google_drive_folder_id 
  ON public.users(google_drive_folder_id) 
  WHERE google_drive_folder_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN public.users.google_drive_folder_id IS 'ID de la carpeta de Google Drive del usuario';
COMMENT ON COLUMN public.users.google_drive_folder_url IS 'URL de la carpeta de Google Drive del usuario';
COMMENT ON COLUMN public.users.google_drive_folder_name IS 'Nombre de la carpeta de Google Drive del usuario';
COMMENT ON COLUMN public.users.google_drive_linked_at IS 'Fecha en que se vinculó la carpeta de Google Drive';

-- Actualizar la tabla user_google_tokens para soportar múltiples servicios
-- Agregar columna para identificar el tipo de servicio (calendar, drive, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_google_tokens' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE public.user_google_tokens ADD COLUMN service_type TEXT DEFAULT 'calendar';
  END IF;
END $$;

-- Actualizar el UNIQUE constraint para permitir múltiples tokens por usuario (uno por servicio)
DO $$
BEGIN
  -- Intentar eliminar el constraint único antiguo si existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_google_tokens_user_id_key'
    AND conrelid = 'public.user_google_tokens'::regclass
  ) THEN
    ALTER TABLE public.user_google_tokens DROP CONSTRAINT user_google_tokens_user_id_key;
  END IF;
END $$;

-- Crear índice único para (user_id, service_type)
DROP INDEX IF EXISTS idx_user_google_tokens_user_service;
CREATE UNIQUE INDEX idx_user_google_tokens_user_service 
  ON public.user_google_tokens(user_id, service_type);

-- Comentarios
COMMENT ON COLUMN public.user_google_tokens.service_type IS 'Tipo de servicio: calendar, drive, o ambos (comma-separated)';

