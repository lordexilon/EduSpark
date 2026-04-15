-- =====================================================
-- Script: Probar consulta de user_institutions como admin-campus
-- Descripción: Verifica qué registros puede ver admin-campus
-- =====================================================

-- 1. Verificar que el usuario admin-campus tiene institución asignada
SELECT 
  'Verificación de admin-campus' as check_type,
  u.id,
  u.email,
  r.name as role_name,
  ui.institution_id,
  ui.is_primary,
  i.name as institution_name
FROM public.users u
INNER JOIN public.roles r ON u.role_id = r.id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.email = 'enzihummer@gmail.com'
  AND r.name = 'admin_campus';

-- 2. Verificar TODOS los usuarios en la institución 2
SELECT 
  'Todos los usuarios en institución 2' as check_type,
  ui.user_id,
  ui.institution_id,
  ui.is_primary,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name
FROM public.user_institutions ui
INNER JOIN public.users u ON u.id = ui.user_id
INNER JOIN public.roles r ON r.id = u.role_id
WHERE ui.institution_id = 2
ORDER BY r.name, u.last_name, u.first_name;

-- 3. Verificar que la función get_user_primary_institution_id funciona
-- (Ejecutar como admin-campus)
SELECT 
  'Función get_user_primary_institution_id' as check_type,
  public.get_user_primary_institution_id() as institution_id_obtenida,
  auth.uid() as usuario_actual;

-- 4. Verificar que is_admin_campus funciona
-- (Ejecutar como admin-campus)
SELECT 
  'Función is_admin_campus' as check_type,
  public.is_admin_campus() as es_admin_campus,
  auth.uid() as usuario_actual;

-- 5. Probar la consulta que hace el frontend (simulando RLS)
-- Esta consulta debería devolver todos los usuarios de la institución 2
-- cuando se ejecuta como admin-campus
SELECT 
  'Consulta simulando frontend' as check_type,
  ui.user_id,
  ui.institution_id,
  ui.is_primary,
  u.email,
  r.name as role_name
FROM public.user_institutions ui
INNER JOIN public.users u ON u.id = ui.user_id
INNER JOIN public.roles r ON r.id = u.role_id
WHERE ui.institution_id = public.get_user_primary_institution_id()
  AND public.is_admin_campus()
ORDER BY r.name, u.last_name, u.first_name;

-- 6. Verificar la política RLS actual
SELECT 
  'Política RLS actual' as check_type,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND policyname = 'admin_campus_coordinator_view_institution_user_institutions';

