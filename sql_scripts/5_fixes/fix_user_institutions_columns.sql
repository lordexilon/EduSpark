-- sql_scripts/fix_user_institutions_columns.sql
-- Script rápido para agregar columnas faltantes a user_institutions
-- Ejecutar en el SQL Editor de Supabase

-- Agregar columna position si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_institutions' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE public.user_institutions ADD COLUMN position VARCHAR(100);
    RAISE NOTICE '✅ Columna position agregada a user_institutions';
  ELSE
    RAISE NOTICE 'ℹ️ Columna position ya existe en user_institutions';
  END IF;
END $$;

-- Agregar columna joined_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_institutions' 
    AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE public.user_institutions ADD COLUMN joined_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE '✅ Columna joined_at agregada a user_institutions';
  ELSE
    RAISE NOTICE 'ℹ️ Columna joined_at ya existe en user_institutions';
  END IF;
END $$;

-- Agregar columna is_primary si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_institutions' 
    AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE public.user_institutions ADD COLUMN is_primary BOOLEAN DEFAULT false;
    RAISE NOTICE '✅ Columna is_primary agregada a user_institutions';
  ELSE
    RAISE NOTICE 'ℹ️ Columna is_primary ya existe en user_institutions';
  END IF;
END $$;

-- Verificar estructura final
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_institutions'
ORDER BY ordinal_position;

