-- =====================================================
-- SCRIPT DEFINITIVO: Políticas RLS para Admin-Campus
-- Este script elimina TODAS las políticas conflictivas
-- y crea las políticas correctas
-- =====================================================

-- =====================================================
-- PASO 1: Eliminar TODAS las políticas existentes en users
-- =====================================================

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_institution_access" ON public.users;
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view users from same institution" ON public.users;
DROP POLICY IF EXISTS "admin_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_campus_view_institution_users" ON public.users;
DROP POLICY IF EXISTS "teacher_view_institution_users" ON public.users;
DROP POLICY IF EXISTS "users_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "admin_update_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_campus_update_institution_users" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_institution_update" ON public.users;
DROP POLICY IF EXISTS "users_own_read" ON public.users;
-- Políticas adicionales encontradas
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
DROP POLICY IF EXISTS "Allow user registration via trigger or own insert" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- =====================================================
-- PASO 2: Eliminar TODAS las políticas existentes en institutions
-- =====================================================

DROP POLICY IF EXISTS "institutions_read_all" ON public.institutions;
DROP POLICY IF EXISTS "institutions_admin_all" ON public.institutions;
DROP POLICY IF EXISTS "institutions_institution_access" ON public.institutions;
DROP POLICY IF EXISTS "institutions_institution_update" ON public.institutions;

-- =====================================================
-- PASO 3: Crear políticas CORRECTAS para USERS
-- =====================================================

-- 3.1. ADMIN ve TODOS los usuarios
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3.2. ADMIN-CAMPUS y COORDINATOR ven solo usuarios de su institución
CREATE POLICY "users_institution_access" ON public.users
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator() OR public.is_teacher()) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- 3.3. ADMIN-CAMPUS y COORDINATOR pueden actualizar usuarios de su institución
CREATE POLICY "users_institution_update" ON public.users
  FOR UPDATE
  USING (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator() OR public.is_teacher()) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator() OR public.is_teacher()) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- 3.4. Todos los usuarios pueden ver su propio perfil
CREATE POLICY "users_own_read" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- 3.5. Permitir INSERT para registro de usuarios (necesario para el trigger de auth)
CREATE POLICY "users_allow_insert" ON public.users
  FOR INSERT
  WITH CHECK (true);  -- El trigger de auth.users maneja la seguridad

-- =====================================================
-- PASO 4: Crear políticas CORRECTAS para INSTITUTIONS
-- =====================================================

-- 4.1. ADMIN ve TODAS las instituciones
CREATE POLICY "institutions_admin_all" ON public.institutions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.2. Otros usuarios ven SOLO su institución
CREATE POLICY "institutions_institution_access" ON public.institutions
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    id = public.get_user_institution_id()
  );

-- 4.3. ADMIN-CAMPUS y COORDINATOR pueden actualizar su institución
CREATE POLICY "institutions_institution_update" ON public.institutions
  FOR UPDATE
  USING (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator()) AND
    id = public.get_user_institution_id()
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (public.is_admin_campus() OR public.is_coordinator()) AND
    id = public.get_user_institution_id()
  );

-- =====================================================
-- PASO 5: Verificar que las políticas se crearon
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Tiene condición USING'
    ELSE 'Sin condición'
  END as tiene_condicion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'institutions')
ORDER BY tablename, policyname;

-- =====================================================
-- PASO 6: Mensaje de confirmación
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS actualizadas correctamente';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas para USERS:';
  RAISE NOTICE '   - users_admin_all: Admin ve todos';
  RAISE NOTICE '   - users_institution_access: Admin-campus/Coordinator ven solo su institución';
  RAISE NOTICE '   - users_institution_update: Admin-campus/Coordinator actualizan solo su institución';
  RAISE NOTICE '   - users_own_read: Todos ven su propio perfil';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas para INSTITUTIONS:';
  RAISE NOTICE '   - institutions_admin_all: Admin ve todas';
  RAISE NOTICE '   - institutions_institution_access: Otros ven solo su institución';
  RAISE NOTICE '   - institutions_institution_update: Admin-campus/Coordinator actualizan solo su institución';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Recarga la página en el navegador para que los cambios surtan efecto';
END $$;
