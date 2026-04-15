-- sql_scripts/153_add_identity_document_type.sql
-- Agregar campo identity_document_type a la tabla users
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. AGREGAR COLUMNA identity_document_type
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'identity_document_type'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN identity_document_type VARCHAR(20);

    RAISE NOTICE '✅ Columna identity_document_type agregada a users';
  ELSE
    RAISE NOTICE 'ℹ️ Columna identity_document_type ya existe en users';
  END IF;
END $$;

-- =====================================================
-- 2. AGREGAR CONSTRAINT CHECK PARA VALORES VÁLIDOS
-- =====================================================
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_identity_document_type_check;

ALTER TABLE public.users
ADD CONSTRAINT users_identity_document_type_check
CHECK (identity_document_type IS NULL OR identity_document_type IN (
  'DNI',           -- Documento Nacional de Identidad
  'CEDULA',        -- Cédula de Identidad
  'PASAPORTE',     -- Pasaporte
  'LICENCIA',      -- Licencia de conducir
  'OTRO'           -- Otro tipo de documento
));

-- =====================================================
-- 3. AGREGAR ÍNDICE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_identity_document_type
ON public.users(identity_document_type)
WHERE identity_document_type IS NOT NULL;

-- =====================================================
-- 4. COMENTARIO
-- =====================================================
COMMENT ON COLUMN public.users.identity_document_type IS
'Tipo de documento de identidad: DNI, CEDULA, PASAPORTE, LICENCIA, OTRO.
Se usa junto con identity_document para identificar completamente al usuario.
Útil para importación masiva, reportes y gestión de pagos.';

-- =====================================================
-- 5. VERIFICACIÓN
-- =====================================================
SELECT
  'Columna' as tipo,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'identity_document_type'
UNION ALL
SELECT
  'Constraint' as tipo,
  constraint_name as column_name,
  constraint_type as data_type,
  'N/A' as is_nullable,
  'N/A' as column_default
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND constraint_type = 'CHECK'
  AND constraint_name LIKE '%identity_document_type%'
UNION ALL
SELECT
  'Índice' as tipo,
  indexname as column_name,
  indexdef as data_type,
  'N/A' as is_nullable,
  'N/A' as column_default
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND indexname LIKE '%identity_document_type%';

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Campo identity_document_type agregado exitosamente';
  RAISE NOTICE '   Valores permitidos: DNI, CEDULA, PASAPORTE, LICENCIA, OTRO';
END $$;

