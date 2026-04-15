-- Verificar jobs después de eliminar uno
-- Este script ayuda a diagnosticar por qué siguen apareciendo jobs después de eliminarlos

-- Ver todos los jobs del usuario
SELECT 
    id,
    file_name,
    status,
    error_message,
    user_id,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update
FROM file_processing_jobs
WHERE user_id = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'
ORDER BY created_at DESC;

-- Verificar si el job eliminado todavía existe
SELECT 
    id,
    file_name,
    status,
    error_message,
    created_at,
    updated_at
FROM file_processing_jobs
WHERE id = '89a35fba-649a-41fc-8b10-4d7c32c4896b';

-- Ver jobs para el archivo específico
SELECT 
    id,
    file_name,
    status,
    error_message,
    bucket_path,
    metadata->>'sourceFileId' as source_file_id,
    created_at,
    updated_at
FROM file_processing_jobs
WHERE bucket_path = '1PjN76B6VopMx7hO2_htb9sqOzr3hWcSE'
   OR metadata->>'sourceFileId' = '1PjN76B6VopMx7hO2_htb9sqOzr3hWcSE'
ORDER BY created_at DESC;

-- Verificar si hay jobs duplicados o con estados inconsistentes
SELECT 
    bucket_path,
    metadata->>'sourceFileId' as source_file_id,
    COUNT(*) as job_count,
    array_agg(status) as statuses,
    array_agg(id) as job_ids,
    array_agg(file_name) as file_names
FROM file_processing_jobs
WHERE user_id = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'
GROUP BY bucket_path, metadata->>'sourceFileId'
HAVING COUNT(*) > 1
ORDER BY job_count DESC;

