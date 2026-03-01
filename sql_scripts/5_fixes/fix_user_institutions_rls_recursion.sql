-- =====================================================
-- Script: Corregir recursión infinita en políticas RLS de user_institutions
-- Descripción: Usa funciones helper con SECURITY DEFINER para evitar recursión
-- Fecha: 2025-12-01
-- =====================================================

-- 1. Eliminar todas las políticas existentes de user_institutions para empezar limpio
DROP POLICY IF EXISTS "supervisor_view_institution_user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "users_view_own_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "admin_campus_view_institution_user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "admin_view_all_user_institutions" ON public.user_institutions;
DROP POLICY IF EXISTS "coordinator_view_institution_user_institutions" ON public.user_institutions;

-- 2. Crear función helper para obtener la institución primaria del usuario actual
-- Esta función usa SECURITY DEFINER para bypass RLS y evitar recursión
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

-- 3. Crear función helper para verificar si es supervisor
-- Ya debería existir, pero la recreamos para asegurar que use SECURITY DEFINER
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

-- 4. Crear función helper para verificar si es admin
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

-- 5. Crear función helper para verificar si es admin_campus
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

-- 6. Crear función helper para verificar si es coordinator
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

-- 7. Habilitar RLS en user_institutions si no está habilitado
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

-- 8. Crear política para que usuarios vean sus propias instituciones
-- Esta política NO causa recursión porque solo compara user_id directamente
CREATE POLICY "users_view_own_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- 9. Crear política para que supervisores vean user_institutions de su institución
-- Usa la función helper que bypass RLS para evitar recursión
CREATE POLICY "supervisor_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    public.is_supervisor()
    AND
    institution_id = public.get_user_primary_institution_id()
  );

-- 10. Crear política para admin-campus y coordinator
CREATE POLICY "admin_campus_coordinator_view_institution_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND
    institution_id = public.get_user_primary_institution_id()
  );

-- 11. Crear política para administradores globales
-- Los admins pueden ver TODAS las entradas de user_institutions sin restricción
CREATE POLICY "admin_view_all_user_institutions" ON public.user_institutions
  FOR SELECT
  USING (
    public.is_admin()
  );

-- 12. IMPORTANTE: Asegurar que los admins también puedan ver user_institutions
-- incluso si no tienen una entrada (porque los admins no requieren institución)
-- Esta política ya está cubierta arriba, pero la documentamos aquí

-- 13. Verificar que las políticas se crearon correctamente
SELECT 
  'Políticas después de la corrección' as check_type,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%supervisor%' THEN '✅ Supervisor'
    WHEN policyname LIKE '%admin_campus%' OR policyname LIKE '%coordinator%' THEN '🏛️ Admin Campus/Coordinator'
    WHEN policyname LIKE '%admin%' AND policyname NOT LIKE '%campus%' THEN '👑 Admin Global'
    WHEN policyname LIKE '%own%' THEN '👤 Propio'
    ELSE '📋 General'
  END as tipo_politica
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_institutions'
ORDER BY tipo_politica, policyname;

-- 14. Verificar que las funciones helper existen
SELECT 
  'Funciones helper' as check_type,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_supervisor', 
    'is_admin', 
    'is_admin_campus', 
    'is_coordinator',
    'get_user_primary_institution_id'
  )
ORDER BY routine_name;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. Este script corrige la recursión infinita usando funciones helper con SECURITY DEFINER.
   Estas funciones se ejecutan con permisos de administrador, bypassing RLS, lo que evita la recursión.

2. La función get_user_primary_institution_id() obtiene la institución del usuario actual
   sin depender de las políticas RLS, evitando así la recursión.

3. Todas las funciones helper usan SECURITY DEFINER para asegurar que puedan acceder
   a las tablas sin restricciones RLS durante su ejecución.

4. Las políticas ahora son simples comparaciones que no consultan user_institutions
   dentro de su propia definición, eliminando la recursión.

5. Después de ejecutar este script, el supervisor debería poder:
   - Iniciar sesión sin errores
   - Ver su propia entrada en user_institutions
   - Ver entradas de user_institutions de usuarios de su institución
   - Acceder a datos relacionados (users, enrollments, etc.)

6. Si aún hay problemas, verifica:
   - Que el supervisor tenga una entrada en user_institutions con is_primary = true
   - Que el rol 'supervisor' exista en la tabla roles
   - Que RLS esté habilitado: ALTER TABLE user_institutions ENABLE ROW LEVEL SECURITY;
*/

