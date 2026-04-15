-- sql_scripts/add_identity_document_to_users.sql
-- Script para agregar campo de documento de identidad a la tabla users
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. AGREGAR COLUMNA identity_document
-- =====================================================

DO $$
BEGIN
  -- Agregar columna identity_document si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'identity_document'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN identity_document VARCHAR(50) UNIQUE;
    
    -- Crear índice para búsquedas rápidas
    CREATE INDEX IF NOT EXISTS idx_users_identity_document 
    ON public.users(identity_document);
    
    RAISE NOTICE '✅ Columna identity_document agregada a users';
  ELSE
    RAISE NOTICE 'ℹ️ Columna identity_document ya existe en users';
  END IF;
END $$;

-- =====================================================
-- 2. COMENTARIO
-- =====================================================

COMMENT ON COLUMN public.users.identity_document IS 
'Documento de identidad único del usuario (DNI, cédula, pasaporte, etc.). Permite identificar usuarios además del email.';

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'identity_document';

