-- Script para resetear el job de Harrison y permitir que la VM lo procese
-- Ejecutar en Supabase SQL Editor

-- 1. Primero, verificar el estado actual del job
SELECT id, file_name, status, 
       metadata->>'chunksProcessed' as chunks_processed,
       metadata->>'chunksTotal' as chunks_total,
       created_at, updated_at
FROM file_processing_jobs
WHERE file_name ILIKE '%Harrison%21%'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Resetear el job a pending para que la VM lo procese
UPDATE file_processing_jobs
SET 
    status = 'pending',
    updated_at = NOW(),
    metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{resetForVM}',
        'true'::jsonb
    )
WHERE id = '01fe229f-f48c-406b-8305-d7f955a50733';

-- 3. Verificar que se actualizó
SELECT id, file_name, status, updated_at
FROM file_processing_jobs
WHERE id = '01fe229f-f48c-406b-8305-d7f955a50733';
