-- =====================================================
-- Script: Corregir prioridad de políticas RLS para admin-campus
-- Descripción: Asegura que admin-campus pueda ver TODOS los usuarios de su institución
-- =====================================================

-- =====================================================
-- PASO 1: Verificar todas las políticas en user_institutions
-- =====================================================

SELECT 
  'Todas las políticas en user_institutions' as verificacion,
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
ORDER BY tipo, policyname;

-- =====================================================
-- PASO 2: Verificar usuarios en institución 2 (sin RLS)
-- =====================================================

-- Esta consulta bypass RLS para verificar datos reales
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

-- =====================================================
-- PASO 3: Verificar que la función get_user_primary_institution_id 
--         puede acceder a user_institutions con SECURITY DEFINER
-- =====================================================

-- Verificar la definición de la función
SELECT 
  'Definición de función' as verificacion,
  routine_name,
  routine_definition,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_primary_institution_id';

-- =====================================================
-- PASO 4: Recrear la política con lógica más explícita
-- =====================================================

-- Eliminar la política existente
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions;

-- Recrear la política con lógica más explícita
-- IMPORTANTE: Usamos una subconsulta directa en lugar de la función
-- para evitar problemas con el contexto de RLS
CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    -- Verificar que el usuario es admin-campus o coordinator
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    -- Verificar que el registro pertenece a la institución del usuario
    -- Usamos subconsulta directa para evitar problemas con funciones en RLS
    institution_id = (
      SELECT ui2.institution_id
      FROM public.user_institutions ui2
      WHERE ui2.user_id = auth.uid()
        AND ui2.is_primary = true
      LIMIT 1
    )
  );

-- =====================================================
-- PASO 5: Verificar que la política se creó correctamente
-- =====================================================

SELECT 
  '✅ Política recreada' as verificacion,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND policyname = 'admin_campus_coordinator_view_institution_user_institutions';

-- =====================================================
-- PASO 6: Verificar que no hay políticas que bloqueen
-- =====================================================

-- Verificar si hay políticas que puedan estar bloqueando
SELECT 
  'Verificación de políticas' as verificacion,
  COUNT(*) as total_politicas,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as politicas_select,
  COUNT(*) FILTER (WHERE cmd = 'ALL') as politicas_all
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions';

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Política recreada con subconsulta directa';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Cambios realizados:';
  RAISE NOTICE '   - La política ahora usa subconsulta directa en lugar de función';
  RAISE NOTICE '   - Esto evita problemas con el contexto de RLS';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Próximos pasos:';
  RAISE NOTICE '   1. Recarga la página /teacher/students';
  RAISE NOTICE '   2. Deberías ver todos los usuarios de la institución';
  RAISE NOTICE '   3. Si aún no funciona, verifica que el estudiante';
  RAISE NOTICE '      tenga is_primary = true en user_institutions';
END $$;

