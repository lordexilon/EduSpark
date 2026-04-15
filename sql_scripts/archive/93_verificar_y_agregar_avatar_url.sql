-- 93_verificar_y_agregar_avatar_url.sql
-- Verificar y agregar columna avatar_url a la tabla users si no existe
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICAR SI LA COLUMNA EXISTE
-- =====================================================

-- Verificar si la columna avatar_url existe
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'avatar_url';

-- =====================================================
-- AGREGAR COLUMNA SI NO EXISTE
-- =====================================================

-- Agregar columna avatar_url si no existe
DO $$
BEGIN
    -- Verificar si la columna existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'avatar_url'
    ) THEN
        -- Agregar la columna
        ALTER TABLE public.users 
        ADD COLUMN avatar_url TEXT;
        
        RAISE NOTICE '✅ Columna avatar_url agregada exitosamente a la tabla users.';
    ELSE
        RAISE NOTICE 'ℹ️ La columna avatar_url ya existe en la tabla users.';
    END IF;
END $$;

-- =====================================================
-- CREAR ÍNDICE (OPCIONAL PERO RECOMENDADO)
-- =====================================================

-- Crear índice para mejorar consultas (solo si no existe)
CREATE INDEX IF NOT EXISTS idx_users_avatar_url 
ON public.users(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- =====================================================
-- AGREGAR COMENTARIO
-- =====================================================

-- Agregar comentario para documentar la columna
COMMENT ON COLUMN public.users.avatar_url IS 
'URL de la imagen de perfil del usuario, almacenada en Supabase Storage bucket "avatars"';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que la columna se agregó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'avatar_url';

-- Mostrar mensaje de éxito
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Verificación completada.';
    RAISE NOTICE '';
    RAISE NOTICE '📋 La columna avatar_url debería estar disponible ahora.';
    RAISE NOTICE '   Si no aparece, verifica que tienes permisos para modificar la tabla users.';
    RAISE NOTICE '';
END $$;

