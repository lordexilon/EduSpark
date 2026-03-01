-- =====================================================
-- CONFIGURAR CRON PARA PROCESAR RETROALIMENTACIÓN
-- =====================================================
-- 
-- Este script configura un cron job en Supabase que ejecuta
-- automáticamente la Edge Function de procesamiento de retroalimentación.
--
-- IMPORTANTE: 
-- 1. Primero debes desplegar la Edge Function "process-feedback"
-- 2. Reemplaza el ANON_KEY si es necesario
-- 3. Ejecuta este SQL en el SQL Editor de Supabase
--
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
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-feedback-daily') THEN
        PERFORM cron.unschedule('process-feedback-daily');
    END IF;
END $$;

-- =====================================================
-- CREAR CRON JOB
-- =====================================================

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

-- Ver el job programado
SELECT 
    jobid,
    schedule,
    jobname,
    active,
    database,
    username
FROM cron.job
WHERE jobname = 'process-feedback-daily';
