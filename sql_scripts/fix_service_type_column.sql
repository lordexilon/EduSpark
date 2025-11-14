-- fix_service_type_column.sql
-- Script para agregar la columna service_type faltante en user_google_tokens
-- Ejecutar este script en el SQL Editor de Supabase si obtienes el error:
-- "Could not find the 'service_type' column of 'user_google_tokens' in the schema cache"

-- Agregar columna service_type si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_google_tokens' 
    AND column_name = 'service_type'
  ) THEN
    -- Agregar la columna con valor por defecto 'calendar' para tokens existentes
    ALTER TABLE public.user_google_tokens 
    ADD COLUMN service_type TEXT DEFAULT 'calendar';
    
    -- Actualizar los registros existentes para que tengan 'calendar' como valor
    UPDATE public.user_google_tokens 
    SET service_type = 'calendar' 
    WHERE service_type IS NULL;
    
    -- Hacer la columna NOT NULL después de actualizar los valores
    ALTER TABLE public.user_google_tokens 
    ALTER COLUMN service_type SET NOT NULL;
    
    -- Eliminar el valor por defecto ya que ahora es NOT NULL
    ALTER TABLE public.user_google_tokens 
    ALTER COLUMN service_type DROP DEFAULT;
  END IF;
END $$;

-- Eliminar el constraint único antiguo si existe (user_id único)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_google_tokens_user_id_key'
    AND conrelid = 'public.user_google_tokens'::regclass
  ) THEN
    ALTER TABLE public.user_google_tokens 
    DROP CONSTRAINT user_google_tokens_user_id_key;
  END IF;
END $$;

-- Crear índice único para (user_id, service_type) si no existe
DROP INDEX IF EXISTS idx_user_google_tokens_user_service;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_google_tokens_user_service 
  ON public.user_google_tokens(user_id, service_type);

-- Agregar comentario a la columna
COMMENT ON COLUMN public.user_google_tokens.service_type IS 'Tipo de servicio: calendar, drive, o both';

