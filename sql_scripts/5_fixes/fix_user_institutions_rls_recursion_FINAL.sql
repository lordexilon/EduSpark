-- =====================================================
-- Script: CORRECCIÓN FINAL - Recursión infinita en user_institutions
-- Descripción: Elimina TODAS las políticas y las recrea correctamente
-- Fecha: 2025-12-01
-- ⚠️ IMPORTANTE: Este script NO modifica roles de usuarios
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- =====================================================

-- Obtener todas las políticas de user_institutions y eliminarlas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_institutions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_institutions', r.policyname);
    RAISE NOTICE 'Eliminada política: %', r.policyname;
  END LOOP;
END $$;

-- =====================================================
-- PASO 2: RECREAR FUNCIONES HELPER CON SECURITY DEFINER
-- =====================================================

-- Función para obtener la institución primaria del usuario
-- CRÍTICO: Usa SECURITY DEFINER para bypass RLS y evitar recursión
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

-- Función para verificar si es supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor()
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
      AND r.name = 'supervisor'
  );
$$;

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
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
      AND r.name = 'admin'
  );
$$;

-- Función para verificar si es admin_campus
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

-- Función para verificar si es coordinator
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

-- Función para verificar si es teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
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
      AND r.name = 'teacher'
  );
$$;

-- =====================================================
-- PASO 3: HABILITAR RLS
-- =====================================================

ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 4: CREAR POLÍTICAS SIMPLES SIN RECURSIÓN
-- =====================================================

-- Política 1: Usuarios pueden ver sus propias instituciones
-- NO causa recursión porque solo compara user_id directamente
CREATE POLICY "users_view_own_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Política 2: Supervisores pueden ver user_institutions de su institución
-- Usa función helper con SECURITY DEFINER para evitar recursión
CREATE POLICY "supervisor_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    public.is_supervisor()
    AND
    institution_id = public.get_user_primary_institution_id()
  );

-- Política 3: Admin-campus y coordinator pueden ver user_institutions de su institución
CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    institution_id = public.get_user_primary_institution_id()
  );

-- Política 4: Admins globales pueden ver TODAS las user_institutions
CREATE POLICY "admin_view_all_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    public.is_admin()
  );

-- Política 5: Teachers pueden ver user_institutions de su institución
CREATE POLICY "teacher_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    public.is_teacher()
    AND
    institution_id = public.get_user_primary_institution_id()
  );

-- =====================================================
-- PASO 5: VERIFICACIÓN
-- =====================================================

-- Verificar políticas creadas
SELECT 
  '✅ Políticas creadas' as verificacion,
  policyname,
  cmd,
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

-- Verificar funciones helper
SELECT 
  '✅ Funciones helper' as verificacion,
  routine_name,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ SECURITY DEFINER'
    ELSE '❌ NO tiene SECURITY DEFINER'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_supervisor',
    'is_admin',
    'is_admin_campus',
    'is_coordinator',
    'is_teacher',
    'get_user_primary_institution_id'
  )
ORDER BY routine_name;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Script ejecutado correctamente';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas creadas:';
  RAISE NOTICE '   - users_view_own_institutions (usuarios ven sus propias instituciones)';
  RAISE NOTICE '   - supervisor_view_institution_user_institutions (supervisores ven su institución)';
  RAISE NOTICE '   - admin_campus_coordinator_view_institution_user_institutions (admin-campus/coordinator ven su institución)';
  RAISE NOTICE '   - teacher_view_institution_user_institutions (teachers ven su institución)';
  RAISE NOTICE '   - admin_view_all_user_institutions (admins ven todas)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Funciones helper recreadas con SECURITY DEFINER:';
  RAISE NOTICE '   - get_user_primary_institution_id()';
  RAISE NOTICE '   - is_supervisor()';
  RAISE NOTICE '   - is_admin()';
  RAISE NOTICE '   - is_admin_campus()';
  RAISE NOTICE '   - is_coordinator()';
  RAISE NOTICE '   - is_teacher()';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Este script NO modifica roles de usuarios';
  RAISE NOTICE '   Solo modifica políticas RLS y funciones helper';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Próximos pasos:';
  RAISE NOTICE '   1. Recarga la aplicación';
  RAISE NOTICE '   2. Intenta iniciar sesión nuevamente';
  RAISE NOTICE '   3. El error de recursión debería estar resuelto';
END $$;

