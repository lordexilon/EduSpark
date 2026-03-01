-- Script para verificar y corregir el acceso de admin-campus a user_institutions
-- Este script verifica si las funciones helper funcionan correctamente

-- =====================================================
-- 1. VERIFICAR FUNCIONES HELPER
-- =====================================================

-- Verificar si is_admin_campus existe y funciona
SELECT 
  'Verificación de is_admin_campus' as check_type,
  public.is_admin_campus() as resultado,
  auth.uid() as usuario_actual;

-- Verificar si get_user_primary_institution_id existe y funciona
SELECT 
  'Verificación de get_user_primary_institution_id' as check_type,
  public.get_user_primary_institution_id() as institution_id_obtenida,
  auth.uid() as usuario_actual;

-- =====================================================
-- 2. VERIFICAR POLÍTICAS RLS EN user_institutions
-- =====================================================

SELECT 
  'Políticas RLS en user_institutions' as check_type,
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
ORDER BY policyname;

-- =====================================================
-- 3. PROBAR CONSULTA DIRECTA (simulando lo que hace el frontend)
-- =====================================================

-- Esta consulta debería devolver todos los usuarios de la institución 2
-- cuando se ejecuta como admin-campus
SELECT 
  'Consulta directa a user_institutions' as check_type,
  ui.user_id,
  ui.institution_id,
  ui.is_primary,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name
FROM public.user_institutions ui
JOIN public.users u ON u.id = ui.user_id
JOIN public.roles r ON r.id = u.role_id
WHERE ui.institution_id = 2
ORDER BY r.name, u.last_name, u.first_name;

-- =====================================================
-- 4. VERIFICAR SI LA POLÍTICA ESTÁ BLOQUEANDO
-- =====================================================

-- Verificar si la política admin_campus_coordinator_view_institution_user_institutions existe
SELECT 
  'Verificación de política específica' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'user_institutions'
        AND policyname = 'admin_campus_coordinator_view_institution_user_institutions'
    ) THEN '✅ Política existe'
    ELSE '❌ Política NO existe'
  END as estado_politica;

-- =====================================================
-- 5. RECREAR LA POLÍTICA SI ES NECESARIO
-- =====================================================

-- Si la política no funciona, recrearla
DO $$
BEGIN
  -- Eliminar política existente si hay problemas
  DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions;
  
  -- Recrear la política con SECURITY DEFINER si es necesario
  CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
    FOR SELECT
    USING (
      (public.is_admin_campus() OR public.is_coordinator())
      AND
      institution_id = public.get_user_primary_institution_id()
    );
  
  RAISE NOTICE '✅ Política recreada para admin-campus y coordinator';
END $$;

-- =====================================================
-- 6. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que ahora funciona
SELECT 
  'Verificación final' as check_type,
  COUNT(*) as total_usuarios_en_institucion_2,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = ui.user_id AND r.name = 'student'
  )) as total_estudiantes
FROM public.user_institutions ui
WHERE ui.institution_id = 2;

