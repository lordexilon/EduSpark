-- =====================================================
-- Script: RESTAURAR políticas RLS que funcionaban
-- Descripción: Restaura las políticas que funcionaban antes del cambio
-- ⚠️ IMPORTANTE: Este script NO modifica roles de usuarios
-- =====================================================

-- =====================================================
-- PASO 1: Eliminar la política problemática
-- =====================================================

DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions;

-- =====================================================
-- PASO 2: Recrear la política usando la función con SECURITY DEFINER
-- =====================================================

-- Esta política usa get_user_primary_institution_id() que tiene SECURITY DEFINER
-- y por lo tanto bypass RLS, evitando recursión
CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    -- Verificar que el usuario es admin-campus o coordinator
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    -- Verificar que el registro pertenece a la institución del usuario
    -- Usa función con SECURITY DEFINER para evitar recursión
    institution_id = public.get_user_primary_institution_id()
  );

-- =====================================================
-- PASO 3: Verificar que la política se creó correctamente
-- =====================================================

SELECT 
  '✅ Política restaurada' as verificacion,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND policyname = 'admin_campus_coordinator_view_institution_user_institutions';

-- =====================================================
-- PASO 4: Verificar que get_user_primary_institution_id tiene SECURITY DEFINER
-- =====================================================

SELECT 
  '✅ Verificación de función' as verificacion,
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Tiene SECURITY DEFINER'
    ELSE '❌ NO tiene SECURITY DEFINER'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_primary_institution_id';

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Política restaurada usando función con SECURITY DEFINER';
  RAISE NOTICE '';
  RAISE NOTICE '📋 La política ahora usa get_user_primary_institution_id()';
  RAISE NOTICE '   que tiene SECURITY DEFINER y bypass RLS, evitando recursión.';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Próximos pasos:';
  RAISE NOTICE '   1. Recarga la aplicación';
  RAISE NOTICE '   2. El error de recursión debería estar resuelto';
  RAISE NOTICE '   3. Si admin-campus aún no ve estudiantes,';
  RAISE NOTICE '      el problema es diferente (no recursión)';
END $$;

