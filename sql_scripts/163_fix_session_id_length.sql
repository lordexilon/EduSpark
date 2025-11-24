-- ✅ FIX: Aumentar tamaño de session_id para soportar JWT tokens largos
-- Los JWT tokens de Supabase pueden ser de 600+ caracteres
-- Fecha: 2025-01-24

-- Modificar columna session_id en user_devices
ALTER TABLE public.user_devices 
ALTER COLUMN session_id TYPE TEXT;

-- Comentario explicativo
COMMENT ON COLUMN public.user_devices.session_id IS 'Session ID de Supabase (JWT token completo)';

-- Verificar el cambio
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'user_devices' 
  AND column_name = 'session_id';
