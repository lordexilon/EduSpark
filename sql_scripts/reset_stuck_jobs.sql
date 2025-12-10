-- Resetear jobs que quedaron en estado 'processing' recientemente para que el worker los tome
UPDATE file_processing_jobs
SET status = 'pending',
    updated_at = NOW()
WHERE status = 'processing'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Verificar si hubo cambios
SELECT id, status, file_name, created_at, updated_at 
FROM file_processing_jobs 
WHERE status = 'pending' 
ORDER BY updated_at DESC;
