-- 55_add_admin_user_management_rls.sql
-- Agrega políticas RLS para que administradores puedan gestionar usuarios
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR POLÍTICAS ACTUALES
-- =====================================================

SELECT 
  'Políticas actuales de users' as verificacion,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- PASO 2: VERIFICAR FUNCIÓN is_admin()
-- =====================================================

SELECT 
  'Función is_admin' as verificacion,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';

-- =====================================================
-- PASO 3: CREAR/VERIFICAR FUNCIÓN is_admin() SI NO EXISTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'admin'
  );
$$;

-- =====================================================
-- PASO 4: AGREGAR POLÍTICAS PARA ADMINISTRADORES
-- =====================================================

-- Política para que administradores puedan ver todos los usuarios
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Política para que administradores puedan actualizar cualquier usuario
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
ON public.users
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Política para que administradores puedan cambiar roles (incluido en UPDATE)
-- La política anterior ya cubre esto

-- =====================================================
-- PASO 5: VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  'Políticas después de la corrección' as verificacion,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%admin%' OR policyname LIKE '%Admin%' THEN '✅ Admin'
    WHEN policyname LIKE '%own%' OR policyname LIKE '%Own%' THEN '👤 Propio'
    WHEN policyname LIKE '%registration%' OR policyname LIKE '%Registration%' THEN '📝 Registro'
    ELSE '📋 General'
  END as tipo_politica
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'POLÍTICAS RLS PARA GESTIÓN DE USUARIOS POR ADMINISTRADORES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas creadas:';
  RAISE NOTICE '   1. Admins can view all users (SELECT)';
  RAISE NOTICE '   2. Admins can update any user (UPDATE)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Los administradores ahora pueden:';
  RAISE NOTICE '   - Ver todos los usuarios del sistema';
  RAISE NOTICE '   - Actualizar datos de cualquier usuario';
  RAISE NOTICE '   - Cambiar roles de usuarios';
  RAISE NOTICE '   - Activar/desactivar usuarios';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ NOTA: Cambiar contraseñas requiere Supabase Admin API';
  RAISE NOTICE '   o un endpoint backend con service role key.';
  RAISE NOTICE '';
END $$;

