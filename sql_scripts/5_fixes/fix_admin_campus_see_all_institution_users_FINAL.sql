-- =====================================================
-- Script: Corregir acceso de admin-campus a user_institutions
-- Descripción: Asegura que admin-campus pueda ver TODOS los usuarios de su institución
-- =====================================================

-- =====================================================
-- PASO 1: Verificar el estado actual
-- =====================================================

-- Verificar usuarios en institución 2
SELECT 
  'Usuarios en institución 2' as verificacion,
  ui.user_id,
  ui.institution_id,
  ui.is_primary,
  u.email,
  r.name as role_name
FROM public.user_institutions ui
INNER JOIN public.users u ON u.id = ui.user_id
INNER JOIN public.roles r ON r.id = u.role_id
WHERE ui.institution_id = 2
ORDER BY r.name, u.last_name, u.first_name;

-- =====================================================
-- PASO 2: Verificar la política actual
-- =====================================================

SELECT 
  'Política actual' as verificacion,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND policyname = 'admin_campus_coordinator_view_institution_user_institutions';

-- =====================================================
-- PASO 3: Eliminar y recrear la política con lógica mejorada
-- =====================================================

-- Eliminar la política existente
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions;

-- Recrear la política
-- IMPORTANTE: La política debe permitir ver TODOS los registros donde institution_id
-- coincide con la institución del usuario, no solo el registro del propio usuario
CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    -- Verificar que el usuario es admin-campus o coordinator
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    -- Verificar que el registro pertenece a la institución del usuario
    -- Esto permite ver TODOS los registros de la institución, no solo el propio
    institution_id = public.get_user_primary_institution_id()
  );

-- =====================================================
-- PASO 4: Verificar que la política se creó correctamente
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
-- PASO 5: Verificar que get_user_primary_institution_id funciona
-- =====================================================

-- Esta consulta debería devolver la institución del usuario actual
-- (Ejecutar como admin-campus para verificar)
SELECT 
  'Verificación de función' as verificacion,
  public.get_user_primary_institution_id() as institution_id_obtenida,
  auth.uid() as usuario_actual,
  CASE 
    WHEN public.get_user_primary_institution_id() = 2 THEN '✅ Correcto (institución 2)'
    WHEN public.get_user_primary_institution_id() IS NULL THEN '❌ NULL - Usuario sin institución'
    ELSE '⚠️ Diferente - Verificar asignación'
  END as estado;

-- =====================================================
-- PASO 6: Verificar que is_admin_campus funciona
-- =====================================================

-- (Ejecutar como admin-campus para verificar)
SELECT 
  'Verificación de rol' as verificacion,
  public.is_admin_campus() as es_admin_campus,
  auth.uid() as usuario_actual,
  CASE 
    WHEN public.is_admin_campus() THEN '✅ Es admin-campus'
    ELSE '❌ NO es admin-campus'
  END as estado;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Política recreada para admin-campus y coordinator';
  RAISE NOTICE '';
  RAISE NOTICE '📋 La política ahora permite ver TODOS los registros de user_institutions';
  RAISE NOTICE '   donde institution_id coincide con la institución del usuario.';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Próximos pasos:';
  RAISE NOTICE '   1. Recarga la página /teacher/students';
  RAISE NOTICE '   2. Deberías ver todos los usuarios de la institución';
  RAISE NOTICE '   3. Incluyendo estudiantes, teachers, etc.';
END $$;

