-- =====================================================
-- Script: Corregir políticas RLS de user_institutions para supervisores
-- Descripción: Permite a supervisores ver user_institutions de su institución
-- =====================================================

-- 1. Verificar estado actual de RLS en user_institutions
SELECT 
  'Estado RLS de user_institutions' as check_type,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_institutions';

-- 2. Verificar políticas existentes
SELECT 
  'Políticas actuales' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
ORDER BY policyname;

-- 3. Habilitar RLS si no está habilitado
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas existentes que puedan estar bloqueando
DROP POLICY IF EXISTS "supervisor_view_institution_user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "users_view_own_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "admin_view_all_user_institutions" ON public.user_institutions;

-- 5. Crear política para que usuarios vean sus propias instituciones
CREATE POLICY "users_view_own_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- 6. Crear política para que supervisores vean user_institutions de su institución
CREATE POLICY "supervisor_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    -- Si el usuario es supervisor
    public.is_supervisor()
    AND
    -- Y la institución de esta entrada es la misma que la del supervisor
    EXISTS (
      SELECT 1
      FROM public.user_institutions ui_supervisor
      WHERE ui_supervisor.user_id = auth.uid()
        AND ui_supervisor.institution_id = user_institutions.institution_id
        AND ui_supervisor.is_primary = true
    )
  );

-- 7. Crear política para admin-campus y coordinator (similar a supervisor)
CREATE POLICY "admin_campus_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    EXISTS (
      SELECT 1
      FROM public.user_institutions ui_current
      WHERE ui_current.user_id = auth.uid()
        AND ui_current.institution_id = user_institutions.institution_id
        AND ui_current.is_primary = true
    )
  );

-- 8. Crear política para administradores globales
CREATE POLICY "admin_view_all_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    public.is_admin()
  );

-- 9. Verificar que las políticas se crearon correctamente
SELECT 
  'Políticas después de la corrección' as check_type,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%supervisor%' THEN '✅ Supervisor'
    WHEN policyname LIKE '%admin_campus%' OR policyname LIKE '%coordinator%' THEN '🏛️ Admin Campus/Coordinator'
    WHEN policyname LIKE '%admin%' AND policyname NOT LIKE '%campus%' THEN '👑 Admin Global'
    WHEN policyname LIKE '%own%' THEN '👤 Propio'
    ELSE '📋 General'
  END as tipo_politica
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
ORDER BY tipo_politica, policyname;

-- 10. Verificar que la función is_supervisor existe
SELECT 
  'Funciones helper' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_supervisor', 'is_admin', 'is_admin_campus', 'is_coordinator')
ORDER BY routine_name;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. Este script crea políticas RLS para que supervisores puedan ver
   las entradas de user_institutions de su institución.

2. Si la función is_supervisor() no existe, ejecuta primero:
   sql_scripts/add_supervisor_rls_policies.sql

3. Después de ejecutar este script, el supervisor debería poder ver
   todos los usuarios (incluyendo estudiantes) de su institución.

4. Verifica que funcione ejecutando como supervisor:
   SELECT * FROM user_institutions WHERE institution_id = 2;
*/

