-- 91_add_avatar_url_to_users.sql
-- Agregar columna avatar_url a la tabla users para almacenar la URL de la imagen de perfil

-- 1. Agregar columna avatar_url si no existe
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Crear índice para mejorar consultas (opcional pero recomendado)
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON public.users(avatar_url) WHERE avatar_url IS NOT NULL;

-- 3. Comentario para documentar la columna
COMMENT ON COLUMN public.users.avatar_url IS 'URL de la imagen de perfil del usuario, almacenada en Supabase Storage';

-- Verificación
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'avatar_url';















