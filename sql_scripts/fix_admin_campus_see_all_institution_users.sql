-- Script para corregir el acceso de admin-campus a ver todos los usuarios de su institución
-- El problema es que admin-campus solo ve su propio registro en user_institutions

-- =====================================================
-- 1. VERIFICAR FUNCIONES HELPER
-- =====================================================

-- Verificar que get_user_primary_institution_id funciona correctamente
SELECT 
  'Verificación de get_user_primary_institution_id' as check_type,
  public.get_user_primary_institution_id() as institution_id,
  auth.uid() as current_user_id;

-- Verificar que is_admin_campus funciona
SELECT 
  'Verificación de is_admin_campus' as check_type,
  public.is_admin_campus() as is_admin_campus,
  auth.uid() as current_user_id;

-- =====================================================
-- 2. VERIFICAR POLÍTICAS ACTUALES
-- =====================================================

SELECT 
  'Políticas actuales' as check_type,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
ORDER BY policyname;

-- =====================================================
-- 3. RECREAR LA POLÍTICA CON MEJOR LÓGICA
-- =====================================================

-- Eliminar la política existente
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions;

-- Recrear la política con lógica mejorada
-- Usa SECURITY DEFINER en las funciones helper para evitar problemas de recursión
CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    -- Verificar que el usuario es admin-campus o coordinator
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    -- Verificar que tiene una institución asignada
    public.get_user_primary_institution_id() IS NOT NULL
    AND
    -- Verificar que la fila pertenece a su institución
    institution_id = public.get_user_primary_institution_id()
  );

-- =====================================================
-- 4. VERIFICAR QUE LA POLÍTICA FUNCIONA
-- =====================================================

-- Esta consulta debería devolver todos los usuarios de la institución del admin-campus
-- cuando se ejecuta como admin-campus (502233ed-a7cd-4362-82ce-94ac80e785dd)
SELECT 
  'Verificación de acceso' as check_type,
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
WHERE ui.institution_id = public.get_user_primary_institution_id()
ORDER BY r.name, u.last_name, u.first_name;

-- =====================================================
-- 5. VERIFICAR FUNCIONES HELPER
-- =====================================================

-- Verificar que todas las funciones helper existen y tienen SECURITY DEFINER
SELECT 
  'Verificación de funciones helper' as check_type,
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Tiene SECURITY DEFINER'
    ELSE '⚠️ NO tiene SECURITY DEFINER'
  END as estado_seguridad
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin_campus',
    'is_coordinator',
    'get_user_primary_institution_id'
  )
ORDER BY routine_name;

-- =====================================================
-- 6. SI LAS FUNCIONES NO TIENEN SECURITY DEFINER, RECREARLAS
-- =====================================================

-- Asegurar que is_admin_campus tiene SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin_campus()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'admin_campus'
  );
$$;

-- Asegurar que is_coordinator tiene SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'coordinator'
  );
$$;

-- Asegurar que get_user_primary_institution_id tiene SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_primary_institution_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id
  FROM public.user_institutions
  WHERE user_id = auth.uid()
    AND is_primary = true
  LIMIT 1;
$$;

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas y funciones actualizadas para admin-campus';
  RAISE NOTICE '   - is_admin_campus() con SECURITY DEFINER';
  RAISE NOTICE '   - is_coordinator() con SECURITY DEFINER';
  RAISE NOTICE '   - get_user_primary_institution_id() con SECURITY DEFINER';
  RAISE NOTICE '   - Política admin_campus_coordinator_view_institution_user_institutions recreada';
END $$;

