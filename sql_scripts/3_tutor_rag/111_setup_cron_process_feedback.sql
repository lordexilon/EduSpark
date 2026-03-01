-- =====================================================
-- CONFIGURAR CRON PARA PROCESAR RETROALIMENTACIÓN
-- =====================================================
-- 
-- Este script configura un cron job en Supabase que ejecuta
-- automáticamente la Edge Function de procesamiento de retroalimentación.
--
-- Requisitos:
-- 1. Extensión pg_cron habilitada (disponible en Supabase)
-- 2. Extensión pg_net habilitada (para llamadas HTTP)
-- 3. Edge Function "process-feedback" desplegada
-- 4. ANON_KEY de Supabase (reemplazar en la URL)

-- =====================================================
-- HABILITAR EXTENSIONES
-- =====================================================

-- Habilitar pg_cron (permite programar tareas)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar pg_net (permite hacer llamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =====================================================
-- ELIMINAR CRON JOB EXISTENTE (SI EXISTE)
-- =====================================================

-- Eliminar el job si ya existe (para evitar duplicados)
SELECT cron.unschedule('process-feedback-daily') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-feedback-daily'
);

-- =====================================================
-- CREAR CRON JOB
-- =====================================================

-- IMPORTANTE: Reemplazar <TU_PROJECT_REF> y <TU_ANON_KEY> con tus valores reales
-- Puedes obtenerlos desde: Supabase Dashboard -> Settings -> API

-- Ejecutar diariamente a las 2:00 AM UTC
SELECT cron.schedule(
    'process-feedback-daily',                    -- Nombre del job
    '0 2 * * *',                                 -- Cron expression: diario a las 2 AM UTC
    $$
    SELECT
      net.http_post(
          url := 'https://mckfscukxcqwntpjagar.supabase.co/functions/v1/process-feedback',
          headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8'
          ),
          body := '{}'::jsonb
      ) as request_id;
    $$
);

-- =====================================================
-- VERIFICAR JOB CREADO
-- =====================================================

-- Ver todos los jobs programados
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
WHERE jobname = 'process-feedback-daily';

-- =====================================================
-- OTRAS CONFIGURACIONES ÚTILES
-- =====================================================

-- Para ejecutar cada 6 horas en lugar de diario:
-- '0 */6 * * *' -- Cada 6 horas

-- Para ejecutar cada hora:
-- '0 * * * *' -- Cada hora

-- Para ejecutar cada 30 minutos:
-- '*/30 * * * *' -- Cada 30 minutos

-- Para ejecutar cada día a las 3:00 AM UTC:
-- '0 3 * * *' -- Diario a las 3 AM UTC

-- =====================================================
-- GESTIÓN DEL CRON JOB
-- =====================================================

-- Deshabilitar temporalmente el job:
-- SELECT cron.unschedule('process-feedback-daily');

-- Habilitar nuevamente:
-- SELECT cron.schedule('process-feedback-daily', '0 2 * * *', ...);

-- Ver historial de ejecuciones (últimas 10):
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-feedback-daily')
-- ORDER BY start_time DESC 
-- LIMIT 10;
