-- Migración: Corrección de Relación PostgREST para Audit Logs
-- Fecha: 2026-04-19
-- Problema: La tabla audit_logs referencia auth.users, lo que impide que PostgREST realice el join con public.users automáticamente.

-- 1. Eliminar la constraint actual (referencia a auth.users)
ALTER TABLE IF EXISTS public.audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

-- 2. Crear la nueva constraint apuntando a public.users
-- Esto permite el join automático vía PostgREST: select=*,actor:users(...)
ALTER TABLE IF EXISTS public.audit_logs
  ADD CONSTRAINT audit_logs_actor_id_fkey 
  FOREIGN KEY (actor_id) 
  REFERENCES public.users(id) 
  ON DELETE SET NULL;

-- 3. Notificar recarga de caché de esquema (opcional para entornos gestionados)
NOTIFY pgrst, 'reload schema';

COMMENT ON CONSTRAINT audit_logs_actor_id_fkey ON public.audit_logs IS 'Relación explícita con profiles para permitir auditoría bilingüe y reportes SCA.';
