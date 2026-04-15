-- Script para corregir las tablas del Tutor Virtual
-- Ejecutar en Supabase SQL Editor

-- Agregar columna metadata a tutor_conversations si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tutor_conversations' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE tutor_conversations ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Columna metadata agregada a tutor_conversations';
    ELSE
        RAISE NOTICE 'Columna metadata ya existe en tutor_conversations';
    END IF;
END $$;

-- Agregar columna audio_url a tutor_messages si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tutor_messages' 
        AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE tutor_messages ADD COLUMN audio_url TEXT;
        RAISE NOTICE 'Columna audio_url agregada a tutor_messages';
    ELSE
        RAISE NOTICE 'Columna audio_url ya existe en tutor_messages';
    END IF;
END $$;

-- Verificar la estructura actualizada
SELECT 'tutor_conversations' as tabla, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tutor_conversations'
ORDER BY ordinal_position;

SELECT 'tutor_messages' as tabla, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tutor_messages'
ORDER BY ordinal_position;
