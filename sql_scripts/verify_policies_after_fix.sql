-- =====================================================
-- Script: Verificar políticas después de la corrección
-- Descripción: Verifica que todas las políticas se crearon correctamente
-- =====================================================

-- Verificar políticas creadas en user_institutions
SELECT 
  '✅ Políticas en user_institutions' as verificacion,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%own%' THEN '👤 Propio'
    WHEN policyname LIKE '%supervisor%' THEN '👨‍💼 Supervisor'
    WHEN policyname LIKE '%admin_campus%' OR policyname LIKE '%coordinator%' THEN '🏛️ Admin Campus/Coordinator'
    WHEN policyname LIKE '%teacher%' THEN '👨‍🏫 Teacher'
    WHEN policyname LIKE '%admin%' AND policyname NOT LIKE '%campus%' THEN '👑 Admin Global'
    ELSE '📋 General'
  END as tipo,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
ORDER BY tipo, policyname;

-- Verificar que RLS está habilitado
SELECT 
  '✅ Estado de RLS' as verificacion,
  schemaname,
  tablename,
  rowsecurity as rls_habilitado,
  CASE 
    WHEN rowsecurity THEN '✅ RLS habilitado'
    ELSE '❌ RLS deshabilitado'
  END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_institutions';

-- Contar políticas por tipo
SELECT 
  '📊 Resumen de políticas' as verificacion,
  COUNT(*) as total_politicas,
  COUNT(*) FILTER (WHERE policyname LIKE '%own%') as politicas_propias,
  COUNT(*) FILTER (WHERE policyname LIKE '%supervisor%') as politicas_supervisor,
  COUNT(*) FILTER (WHERE policyname LIKE '%admin_campus%' OR policyname LIKE '%coordinator%') as politicas_admin_campus_coord,
  COUNT(*) FILTER (WHERE policyname LIKE '%teacher%') as politicas_teacher,
  COUNT(*) FILTER (WHERE policyname LIKE '%admin%' AND policyname NOT LIKE '%campus%') as politicas_admin_global
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions';

