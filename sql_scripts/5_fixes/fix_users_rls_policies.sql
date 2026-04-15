-- sql_scripts/fix_users_rls_policies.sql
-- Script para corregir las políticas RLS de la tabla users
-- Asegura que admin-campus, coordinator y teacher solo vean usuarios de su institución

-- =====================================================
-- 1. ELIMINAR POLÍTICAS EXISTENTES
-- =====================================================

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_institution_access" ON public.users;
DROP POLICY IF EXISTS "users_own_read" ON public.users;

-- =====================================================
-- 2. VERIFICAR QUE LAS FUNCIONES HELPER EXISTAN
-- =====================================================

-- Asegurar que las funciones helper existan
DO $$
BEGIN
  -- Verificar is_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    RAISE EXCEPTION 'La función public.is_admin() no existe. Ejecuta implement_institution_based_roles.sql primero.';
  END IF;

  -- Verificar get_user_institution_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_user_institution_id'
  ) THEN
    RAISE EXCEPTION 'La función public.get_user_institution_id() no existe. Ejecuta implement_institution_based_roles.sql primero.';
  END IF;

  -- Verificar is_admin_campus
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_campus'
  ) THEN
    RAISE EXCEPTION 'La función public.is_admin_campus() no existe. Ejecuta implement_institution_based_roles.sql primero.';
  END IF;

  -- Verificar is_coordinator
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_coordinator'
  ) THEN
    RAISE EXCEPTION 'La función public.is_coordinator() no existe. Ejecuta implement_institution_based_roles.sql primero.';
  END IF;

  -- Verificar is_teacher
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_teacher'
  ) THEN
    RAISE EXCEPTION 'La función public.is_teacher() no existe. Ejecuta implement_institution_based_roles.sql primero.';
  END IF;
END $$;

-- =====================================================
-- 3. CREAR POLÍTICAS RLS CORRECTAS
-- =====================================================

-- Política 1: Admin ve todos los usuarios
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Política 2: Admin-campus, coordinador y teacher ven usuarios de su institución
-- IMPORTANTE: Esta política verifica que:
-- 1. El usuario que consulta NO sea admin
-- 2. El usuario que consulta sea admin-campus, coordinator o teacher
-- 3. El usuario que consulta tenga una institución asignada (get_user_institution_id() no sea NULL)
-- 4. El usuario consultado pertenezca a la misma institución
CREATE POLICY "users_institution_access" ON public.users
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher()
    ) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Política 3: Admin-campus, coordinador y teacher pueden actualizar usuarios de su institución
CREATE POLICY "users_institution_update" ON public.users
  FOR UPDATE
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher()
    ) AND
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
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher()
    ) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Política 4: Usuarios pueden ver su propio perfil
CREATE POLICY "users_own_read" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- =====================================================
-- 4. VERIFICAR QUE RLS ESTÉ HABILITADO
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS ACTUALIZADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas creadas:';
  RAISE NOTICE '   - users_admin_all: Admin ve todos los usuarios';
  RAISE NOTICE '   - users_institution_access: Admin-campus, coordinator y teacher ven usuarios de su institución';
  RAISE NOTICE '   - users_institution_update: Admin-campus, coordinator y teacher pueden actualizar usuarios de su institución';
  RAISE NOTICE '   - users_own_read: Usuarios pueden ver su propio perfil';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   - Asegúrate de que todos los usuarios tengan una institución asignada';
  RAISE NOTICE '   - Ejecuta ensure_users_have_institution.sql para verificar';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

