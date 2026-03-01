-- =====================================================
-- Script: Verificar estado actual de políticas RLS
-- Descripción: Verifica todas las políticas y su orden de evaluación
-- =====================================================

-- 1. Verificar todas las políticas en user_institutions
SELECT 
  'Todas las políticas' as verificacion,
  policyname,
  cmd,
  qual as using_clause,
  CASE 
    WHEN policyname LIKE '%own%' THEN '👤 Propio'
    WHEN policyname LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN policyname LIKE '%admin_campus%' OR policyname LIKE '%coordinator%' THEN '🏛️ Admin Campus/Coordinator'
    WHEN policyname LIKE '%teacher%' THEN '👨‍🏫 Teacher'
    WHEN policyname LIKE '%admin%' AND policyname NOT LIKE '%campus%' THEN '👑 Admin Global'
    ELSE '📋 General'
  END as tipo
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
ORDER BY 
  CASE 
    WHEN policyname LIKE '%own%' THEN 1
    WHEN policyname LIKE '%admin%' AND policyname NOT LIKE '%campus%' THEN 2
    WHEN policyname LIKE '%admin_campus%' OR policyname LIKE '%coordinator%' THEN 3
    WHEN policyname LIKE '%supervisor%' THEN 4
    WHEN policyname LIKE '%teacher%' THEN 5
    ELSE 6
  END,
  policyname;

-- 2. Verificar usuarios en institución 2 (bypass RLS para diagnóstico)
SELECT 
  'Usuarios en institución 2 (sin RLS)' as verificacion,
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

-- 3. Verificar que get_user_primary_institution_id tiene SECURITY DEFINER
SELECT 
  'Función get_user_primary_institution_id' as verificacion,
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Tiene SECURITY DEFINER'
    ELSE '❌ NO tiene SECURITY DEFINER'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_primary_institution_id';

-- 4. Verificar que is_admin_campus tiene SECURITY DEFINER
SELECT 
  'Función is_admin_campus' as verificacion,
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Tiene SECURITY DEFINER'
    ELSE '❌ NO tiene SECURITY DEFINER'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin_campus';

