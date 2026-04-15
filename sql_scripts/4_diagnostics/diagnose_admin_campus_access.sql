-- =====================================================
-- Script: Diagnosticar acceso de admin-campus
-- Descripción: Verifica por qué admin-campus solo ve 1 usuario
-- =====================================================

-- 1. Verificar TODAS las políticas SELECT en user_institutions
SELECT 
  'Políticas SELECT' as verificacion,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- 2. Verificar usuarios en institución 2 (bypass RLS)
SELECT 
  'Usuarios en institución 2 (sin RLS)' as verificacion,
  COUNT(*) as total_usuarios,
  COUNT(*) FILTER (WHERE r.name = 'admin_campus') as admin_campus_count,
  COUNT(*) FILTER (WHERE r.name = 'student') as student_count,
  COUNT(*) FILTER (WHERE r.name = 'supervisor') as supervisor_count
FROM public.user_institutions ui
INNER JOIN public.users u ON u.id = ui.user_id
INNER JOIN public.roles r ON r.id = u.role_id
WHERE ui.institution_id = 2;

-- 3. Listar todos los usuarios en institución 2 con detalles
SELECT 
  'Detalles de usuarios en institución 2' as verificacion,
  ui.user_id,
  ui.institution_id,
  ui.is_primary,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  r.id as role_id
FROM public.user_institutions ui
INNER JOIN public.users u ON u.id = ui.user_id
INNER JOIN public.roles r ON r.id = u.role_id
WHERE ui.institution_id = 2
ORDER BY r.name, u.last_name, u.first_name;

-- 4. Verificar si hay políticas que puedan estar bloqueando
-- (Políticas que usan AND en lugar de OR)
SELECT 
  'Análisis de políticas' as verificacion,
  policyname,
  CASE 
    WHEN qual LIKE '%AND%' THEN '⚠️ Usa AND - puede limitar resultados'
    WHEN qual LIKE '%OR%' THEN '✅ Usa OR - permite múltiples condiciones'
    ELSE '📋 Sin operadores lógicos'
  END as analisis_logico
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND cmd = 'SELECT';

-- 5. Verificar el orden de evaluación de políticas
-- En PostgreSQL, las políticas se evalúan con OR, pero el orden puede afectar
SELECT 
  'Orden de políticas' as verificacion,
  policyname,
  cmd,
  row_number() OVER (ORDER BY policyname) as orden_evaluacion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND cmd = 'SELECT'
ORDER BY policyname;

