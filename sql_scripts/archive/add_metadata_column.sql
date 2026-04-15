-- Script para agregar campos faltantes a tutor_conversations
-- Ejecutar en Supabase SQL Editor

-- Agregar columna metadata si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tutor_conversations' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE tutor_conversations ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Verificar la estructura actualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tutor_conversations'
ORDER BY ordinal_position;
