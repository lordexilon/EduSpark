-- sql_scripts/add_google_drive_fields.sql
-- Agregar campos de Google Drive a la tabla users

-- Agregar columna google_drive_folder_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'google_drive_folder_id'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN google_drive_folder_id text;
    
    COMMENT ON COLUMN public.users.google_drive_folder_id IS 
    'ID de la carpeta de Google Drive vinculada al usuario';
  END IF;
END $$;

-- Agregar columna google_drive_folder_name si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'google_drive_folder_name'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN google_drive_folder_name text;
    
    COMMENT ON COLUMN public.users.google_drive_folder_name IS 
    'Nombre de la carpeta de Google Drive vinculada al usuario';
  END IF;
END $$;

-- Agregar columna google_drive_folder_url si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'google_drive_folder_url'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN google_drive_folder_url text;
    
    COMMENT ON COLUMN public.users.google_drive_folder_url IS 
    'URL de la carpeta de Google Drive vinculada al usuario';
  END IF;
END $$;

-- Agregar columna google_drive_linked_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'google_drive_linked_at'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN google_drive_linked_at timestamp with time zone;
    
    COMMENT ON COLUMN public.users.google_drive_linked_at IS 
    'Fecha y hora en que se vinculó la carpeta de Google Drive';
  END IF;
END $$;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_google_drive_folder 
ON public.users(google_drive_folder_id) 
WHERE google_drive_folder_id IS NOT NULL;

