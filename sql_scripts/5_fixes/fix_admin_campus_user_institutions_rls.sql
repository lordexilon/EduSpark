-- Script para corregir el acceso de admin-campus a user_institutions
-- El problema es que get_user_primary_institution_id() devuelve null desde el frontend

-- =====================================================
-- 1. VERIFICAR Y CORREGIR LA FUNCIÓN get_user_primary_institution_id
-- =====================================================

-- La función debe usar SECURITY DEFINER para bypass RLS
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
-- 2. RECREAR LA POLÍTICA CON LÓGICA MEJORADA
-- =====================================================

-- Eliminar políticas conflictivas
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "user_institutions_institution_access" ON public.user_institutions;

-- Crear una política más robusta que no dependa solo de get_user_primary_institution_id
-- Usa una subconsulta directa para evitar problemas con funciones
CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    -- Verificar que el usuario es admin-campus o coordinator
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    -- Verificar que la fila pertenece a la institución del usuario
    -- Usamos una subconsulta directa en lugar de la función para evitar problemas
    institution_id = (
      SELECT ui2.institution_id
      FROM public.user_institutions ui2
      WHERE ui2.user_id = auth.uid()
        AND ui2.is_primary = true
      LIMIT 1
    )
  );

-- =====================================================
-- 3. VERIFICAR QUE LAS FUNCIONES HELPER TIENEN SECURITY DEFINER
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

-- =====================================================
-- 4. VERIFICACIÓN
-- =====================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  'Políticas después de la corrección' as check_type,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
  AND policyname LIKE '%admin_campus%' OR policyname LIKE '%coordinator%'
ORDER BY policyname;

-- Verificar que las funciones tienen SECURITY DEFINER
SELECT 
  'Verificación de funciones' as check_type,
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Tiene SECURITY DEFINER'
    ELSE '❌ NO tiene SECURITY DEFINER'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin_campus',
    'is_coordinator',
    'get_user_primary_institution_id'
  )
ORDER BY routine_name;

-- =====================================================
-- 5. NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Política recreada para admin-campus y coordinator';
  RAISE NOTICE '   - Usa subconsulta directa en lugar de función para evitar problemas';
  RAISE NOTICE '   - Todas las funciones helper tienen SECURITY DEFINER';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Si el problema persiste, puede ser que auth.uid()';
  RAISE NOTICE '   no esté disponible en el contexto de la política RLS.';
  RAISE NOTICE '   En ese caso, necesitaremos usar una función diferente.';
END $$;

