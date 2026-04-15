-- Script para agregar columnas faltantes a student_learning_profiles
-- Ejecutar en Supabase SQL Editor

-- Agregar columna interaction_count si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_learning_profiles' 
        AND column_name = 'interaction_count'
    ) THEN
        ALTER TABLE student_learning_profiles ADD COLUMN interaction_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna interaction_count agregada';
    ELSE
        RAISE NOTICE 'Columna interaction_count ya existe';
    END IF;
END $$;

-- Agregar columna avg_session_duration si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_learning_profiles' 
        AND column_name = 'avg_session_duration'
    ) THEN
        ALTER TABLE student_learning_profiles ADD COLUMN avg_session_duration INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna avg_session_duration agregada';
    ELSE
        RAISE NOTICE 'Columna avg_session_duration ya existe';
    END IF;
END $$;

-- Agregar columna last_updated si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'student_learning_profiles' 
        AND column_name = 'last_updated'
    ) THEN
        ALTER TABLE student_learning_profiles ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Columna last_updated agregada';
    ELSE
        RAISE NOTICE 'Columna last_updated ya existe';
    END IF;
END $$;

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_learning_profiles'
ORDER BY ordinal_position;
