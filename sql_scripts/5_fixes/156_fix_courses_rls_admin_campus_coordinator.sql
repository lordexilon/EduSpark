-- =====================================================
-- FIX: Permitir acceso a cursos para ADMIN-CAMPUS y COORDINATOR
-- =====================================================
-- Este script actualiza las políticas RLS de la tabla courses
-- para que admin-campus y coordinator puedan ver y editar cursos
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. CREAR FUNCIONES HELPER (si no existen)
-- =====================================================

-- Función para verificar si es admin-campus
-- Usa JWT directamente para evitar problemas con auth.uid() en contexto RLS
CREATE OR REPLACE FUNCTION public.is_admin_campus_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_role_name TEXT;
BEGIN
  -- Obtener user_id del JWT token directamente
  v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  
  -- Si no hay user_id, intentar con auth.uid() como fallback
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;
  
  -- Si aún no hay user_id, retornar false
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Deshabilitar RLS temporalmente para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente el rol del usuario
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id
    AND u.is_active = true;
  
  RETURN COALESCE(v_role_name = 'admin-campus', false);
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar false por seguridad
    RETURN false;
END;
$$;

-- Función para verificar si es coordinator
-- Usa JWT directamente para evitar problemas con auth.uid() en contexto RLS
CREATE OR REPLACE FUNCTION public.is_coordinator_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_role_name TEXT;
BEGIN
  -- Obtener user_id del JWT token directamente
  v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  
  -- Si no hay user_id, intentar con auth.uid() como fallback
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;
  
  -- Si aún no hay user_id, retornar false
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Deshabilitar RLS temporalmente para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente el rol del usuario
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id
    AND u.is_active = true;
  
  RETURN COALESCE(v_role_name = 'coordinator', false);
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar false por seguridad
    RETURN false;
END;
$$;

-- Función para verificar si es admin, admin-campus o coordinator
-- Usa JWT directamente para evitar problemas con auth.uid() en contexto RLS
CREATE OR REPLACE FUNCTION public.is_admin_or_manager_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_role_name TEXT;
BEGIN
  -- Obtener user_id del JWT token directamente
  -- Esto funciona mejor que auth.uid() en contexto RLS
  v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  
  -- Si no hay user_id, intentar con auth.uid() como fallback
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;
  
  -- Si aún no hay user_id, retornar false
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Deshabilitar RLS temporalmente para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente el rol del usuario
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id
    AND u.is_active = true;
  
  -- Retornar true si el rol es admin, admin-campus o coordinator
  RETURN COALESCE(v_role_name IN ('admin', 'admin-campus', 'coordinator'), false);
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar false por seguridad
    RETURN false;
END;
$$;

-- =====================================================
-- 2. ACTUALIZAR POLÍTICAS RLS DE COURSES
-- =====================================================

-- Eliminar política antigua que solo permite admin
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;

-- Crear nueva política que permite admin, admin-campus y coordinator
-- IMPORTANTE: 
-- - USING: permite ver/leer cursos si es admin/manager
-- - WITH CHECK: permite crear/actualizar cursos si es admin/manager
--   Esto permite que admin-campus pueda actualizar cursos incluso si no es el dueño
-- 
-- Usamos la función helper que lee del JWT directamente
-- Si la función falla, usamos una subconsulta directa como fallback
CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL 
  TO authenticated
  USING (public.is_admin_or_manager_safe())
  WITH CHECK (public.is_admin_or_manager_safe());

-- IMPORTANTE: Verificar que no haya conflictos con courses_owner_rw
-- Si un usuario es admin-campus Y es dueño del curso, ambas políticas aplican (OR)
-- Pero si es admin-campus y NO es dueño, solo courses_admin_all aplica

-- Verificar que la política courses_owner_rw existe y permite a los dueños editar sus cursos
-- Esta política permite que los teachers editen solo sus propios cursos
-- Si no existe, crearla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'courses' 
    AND policyname = 'courses_owner_rw'
  ) THEN
    CREATE POLICY "courses_owner_rw" ON public.courses
      FOR ALL 
      TO authenticated
      USING (teacher_id = auth.uid()) 
      WITH CHECK (teacher_id = auth.uid());
    
    RAISE NOTICE '✅ Política courses_owner_rw creada';
  ELSE
    RAISE NOTICE 'ℹ️ Política courses_owner_rw ya existe';
  END IF;
END $$;

-- =====================================================
-- 3. VERIFICACIÓN Y TEST
-- =====================================================

-- Test: Verificar que las funciones funcionan para el usuario actual
SELECT 
    'Test funciones helper' as test_type,
    auth.uid() as current_user_id,
    public.is_admin_or_manager_safe() as is_admin_or_manager,
    public.is_admin_campus_safe() as is_admin_campus,
    public.is_coordinator_safe() as is_coordinator,
    (SELECT r.name FROM public.users u JOIN public.roles r ON u.role_id = r.id WHERE u.id = auth.uid()) as current_role;

-- Verificar que las políticas existen
SELECT 
    'Políticas RLS de courses' as check_type,
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- Verificar que las funciones existen
SELECT 
    'Funciones helper' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin_safe', 'is_admin_campus_safe', 'is_coordinator_safe', 'is_admin_or_manager_safe')
ORDER BY routine_name;

-- Test: Verificar acceso a un curso específico (reemplaza 12 con el ID del curso que quieres probar)
SELECT 
    'Test acceso a curso' as test_type,
    id,
    title,
    teacher_id,
    auth.uid() as current_user_id,
    public.is_admin_or_manager_safe() as can_access_via_admin,
    (teacher_id = auth.uid()) as can_access_via_owner
FROM public.courses
WHERE id = 12;

-- =====================================================
-- 4. NOTA IMPORTANTE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Políticas RLS actualizadas para courses';
    RAISE NOTICE '';
    RAISE NOTICE 'Ahora admin, admin-campus y coordinator pueden:';
    RAISE NOTICE '  - Ver todos los cursos';
    RAISE NOTICE '  - Crear cursos';
    RAISE NOTICE '  - Editar cualquier curso';
    RAISE NOTICE '  - Eliminar cursos';
    RAISE NOTICE '';
    RAISE NOTICE 'Los teachers pueden seguir editando sus propios cursos';
    RAISE NOTICE '========================================';
END $$;

