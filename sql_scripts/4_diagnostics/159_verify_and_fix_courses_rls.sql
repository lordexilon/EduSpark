-- =====================================================
-- VERIFICACIÓN Y CORRECCIÓN: Políticas RLS de courses
-- =====================================================
-- Este script verifica y corrige las políticas RLS para courses
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. VERIFICAR FUNCIONES EXISTENTES
-- =====================================================

SELECT 
    'Funciones existentes' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin_or_manager_safe', 'is_admin_campus_safe', 'is_coordinator_safe')
ORDER BY routine_name;

-- =====================================================
-- 2. VERIFICAR POLÍTICAS EXISTENTES
-- =====================================================

SELECT 
    'Políticas actuales' as check_type,
    policyname,
    cmd,
    permissive,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- =====================================================
-- 3. RECREAR FUNCIONES HELPER (asegurar que existen)
-- =====================================================

-- Función para verificar si es admin-campus
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
    RETURN false;
END;
$$;

-- Función para verificar si es coordinator
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
  v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SET LOCAL row_security = off;
  
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id
    AND u.is_active = true;
  
  RETURN COALESCE(v_role_name = 'coordinator', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Función para verificar si es admin, admin-campus o coordinator
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
-- 4. ELIMINAR Y RECREAR POLÍTICAS
-- =====================================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_owner_rw" ON public.courses;

-- Crear política para admin, admin-campus y coordinator
-- Esta política permite SELECT, INSERT, UPDATE, DELETE
-- Usamos subconsulta directa como alternativa más confiable
CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
        AND r.name IN ('admin', 'admin-campus', 'coordinator')
        AND u.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
        AND r.name IN ('admin', 'admin-campus', 'coordinator')
        AND u.is_active = true
    )
  );

-- Crear política para owners (teachers)
-- Esta política permite que los teachers editen sus propios cursos
CREATE POLICY "courses_owner_rw" ON public.courses
  FOR ALL 
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- =====================================================
-- 5. VERIFICACIÓN FINAL
-- =====================================================

SELECT 
    'Políticas finales' as check_type,
    policyname,
    cmd,
    permissive,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- =====================================================
-- 6. NOTA IMPORTANTE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Políticas RLS recreadas para courses';
    RAISE NOTICE '';
    RAISE NOTICE 'Políticas activas:';
    RAISE NOTICE '  1. courses_admin_all: admin, admin-campus, coordinator';
    RAISE NOTICE '  2. courses_owner_rw: teachers (solo sus cursos)';
    RAISE NOTICE '';
    RAISE NOTICE 'Prueba crear/editar un curso desde el frontend';
    RAISE NOTICE '========================================';
END $$;

