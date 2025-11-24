-- =====================================================
-- Script de Diagnóstico RLS para Admin-Campus
-- Ejecutar esto EN SUPABASE SQL EDITOR mientras estás logueado como admin-campus
-- =====================================================

-- 1. Verificar si RLS está habilitado en la tabla users
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';

-- 2. Ver todas las políticas actuales en la tabla users
SELECT 
  policyname,
  cmd,
  SUBSTRING(qual::text, 1, 100) as condicion_using
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- 3. Ver mi usuario actual y mi institución
SELECT 
  auth.uid() as mi_user_id,
  u.email as mi_email,
  r.name as mi_rol,
  ui.institution_id as mi_institucion_id,
  i.name as mi_institucion_nombre
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.id = auth.uid();

-- 4. Verificar funciones helper
SELECT 
  public.is_admin() as soy_admin,
  public.is_admin_campus() as soy_admin_campus,
  public.is_coordinator() as soy_coordinator,
  public.get_user_institution_id() as mi_institucion_id;

-- 5. Ver TODOS los usuarios con sus instituciones (sin filtro RLS)
-- NOTA: Si RLS está funcionando, esto solo mostrará usuarios de tu institución
SELECT 
  u.id,
  u.email,
  u.first_name || ' ' || u.last_name as nombre_completo,
  r.name as rol,
  ui.institution_id,
  i.name as institucion_nombre
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
ORDER BY ui.institution_id, r.name, u.last_name;

-- 6. Contar usuarios por institución que puedo ver
SELECT 
  COALESCE(i.name, 'Sin institución') as institucion,
  COUNT(*) as cantidad_usuarios,
  STRING_AGG(r.name, ', ') as roles_presentes
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
GROUP BY i.name
ORDER BY cantidad_usuarios DESC;

-- =====================================================
-- ACCIONES CORRECTIVAS (si es necesario)
-- =====================================================

-- Si RLS NO está habilitado, ejecutar:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Si el usuario admin-campus NO tiene institución asignada, ejecutar:
-- UPDATE: Reemplazar 'USER_ID_AQUI' con el ID del usuario admin-campus
-- UPDATE: Reemplazar 'INSTITUTION_ID' con el ID de la institución
/*
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES ('USER_ID_AQUI', INSTITUTION_ID, true, NOW())
ON CONFLICT (user_id, institution_id) 
DO UPDATE SET is_primary = true;
*/

-- Si las políticas NO existen, ejecutar el script:
-- fix_users_rls_for_admin_campus.sql
