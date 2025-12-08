-- Verificar el error del job que falló recientemente
-- Job ID: 44464438-f5e0-4315-864f-c5796a2debdd

SELECT 
    id,
    file_name,
    status,
    error_message,
    created_at,
    updated_at,
    metadata->>'materialId' as material_id,
    metadata->>'sourceFileId' as source_file_id,
    EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_between_create_and_update
FROM file_processing_jobs
WHERE id = '44464438-f5e0-4315-864f-c5796a2debdd'
   OR id = '6172b586-5f1a-44a1-9591-2bd670c697f5'
ORDER BY created_at DESC;

-- Ver todos los jobs fallidos recientes (excluyendo cancelados manualmente)
SELECT 
    id,
    file_name,
    status,
    error_message,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_between_create_and_update,
    CASE 
        WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) < 60 THEN 'Fallo inmediato'
        WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) < 300 THEN 'Fallo rápido (<5min)'
        WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) < 1800 THEN 'Fallo durante procesamiento (<30min)'
        ELSE 'Fallo después de mucho tiempo (>30min)'
    END as tipo_fallo
FROM file_processing_jobs
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '2 hours'
  AND error_message != 'Cancelado por el usuario'  -- Excluir cancelaciones manuales
ORDER BY created_at DESC
LIMIT 10;

-- Ver jobs pendientes o en procesamiento
SELECT 
    id,
    file_name,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update,
    metadata->>'chunksProcessed' as chunks_processed,
    metadata->>'chunksTotal' as chunks_total
FROM file_processing_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC
LIMIT 10;

-- Ver el error específico del job más reciente que falló
SELECT 
    id,
    file_name,
    status,
    error_message,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_between_create_and_update,
    metadata
FROM file_processing_jobs
WHERE id = '89a35fba-649a-41fc-8b10-4d7c32c4896b'
   OR (status = 'failed' 
       AND created_at > NOW() - INTERVAL '30 minutes'
       AND error_message != 'Cancelado por el usuario')
ORDER BY created_at DESC
LIMIT 5;

