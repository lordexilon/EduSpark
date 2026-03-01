-- =====================================================
-- VERIFICAR CRON JOB DE PROCESAMIENTO DE RETROALIMENTACIÓN
-- =====================================================

-- 1. Ver información del cron job
SELECT 
    jobid,
    schedule,
    jobname,
    active,
    database,
    username
FROM cron.job
WHERE jobname = 'process-feedback-daily';

-- 2. Ver historial de ejecuciones (últimas 10)
SELECT 
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time,
    end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-feedback-daily')
ORDER BY start_time DESC
LIMIT 10;

-- 3. Ver últimas ejecuciones exitosas
SELECT 
    start_time,
    end_time,
    status,
    return_message,
    end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-feedback-daily')
  AND status = 'succeeded'
ORDER BY start_time DESC
LIMIT 5;

-- 4. Ver últimas ejecuciones con errores
SELECT 
    start_time,
    status,
    return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-feedback-daily')
  AND status != 'succeeded'
ORDER BY start_time DESC
LIMIT 5;

-- 5. Verificar respuestas procesadas recientemente (por el cron)
SELECT 
    processed_at,
    status,
    COUNT(*) as total,
    AVG(quality_score) as avg_quality_score
FROM tutor_general_knowledge_responses
WHERE processed_at >= NOW() - INTERVAL '24 hours'
GROUP BY processed_at, status
ORDER BY processed_at DESC;
