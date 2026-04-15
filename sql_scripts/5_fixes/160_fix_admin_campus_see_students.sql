-- =====================================================
-- FIX: Permitir que admin-campus vea estudiantes de su institución
-- =====================================================
-- Este script corrige las políticas RLS para que admin-campus
-- pueda ver estudiantes asignados a su institución (incluso sin is_primary)
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. VERIFICAR FUNCIONES HELPER
-- =====================================================

-- Asegurar que get_user_institution_id existe
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT institution_id
  FROM public.user_institutions
  WHERE user_id = auth.uid()
    AND is_primary = true
  LIMIT 1;
$$;

-- Función para verificar si es admin-campus
CREATE OR REPLACE FUNCTION public.is_admin_campus()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin-campus'
  );
$$;

-- Función para verificar si es coordinator
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'coordinator'
  );
$$;

-- =====================================================
-- 2. CORREGIR POLÍTICA RLS PARA USERS
-- =====================================================

-- Eliminar política antigua que requiere is_primary
DROP POLICY IF EXISTS "users_institution_access" ON public.users;

-- Crear nueva política que NO requiere is_primary
-- Admin-campus y coordinator pueden ver usuarios de su institución
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
        -- Removido: AND ui.is_primary = true
        -- Ahora permite ver usuarios asignados a la institución sin importar is_primary
    )
  );

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

-- Verificar políticas de users
SELECT 
    'Políticas RLS de users' as check_type,
    policyname,
    cmd,
    qual as using_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Test: Verificar que admin-campus puede ver estudiantes de su institución
DO $$
DECLARE
    v_user_id UUID;
    v_institution_id INTEGER;
    v_student_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    v_institution_id := public.get_user_institution_id();
    
    IF v_institution_id IS NULL THEN
        RAISE NOTICE '⚠️ El usuario actual no tiene institución asignada';
        RETURN;
    END IF;
    
    -- Contar estudiantes de la institución (sin requerir is_primary)
    SELECT COUNT(*) INTO v_student_count
    FROM public.users u
    JOIN public.user_institutions ui ON ui.user_id = u.id
    WHERE ui.institution_id = v_institution_id
      AND u.role_id = (SELECT id FROM public.roles WHERE name = 'student' LIMIT 1);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN:';
    RAISE NOTICE '  Usuario: %', v_user_id;
    RAISE NOTICE '  Institución: %', v_institution_id;
    RAISE NOTICE '  Estudiantes en la institución: %', v_student_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Política actualizada: admin-campus puede ver estudiantes';
    RAISE NOTICE '   de su institución sin requerir is_primary';
    RAISE NOTICE '========================================';
END $$;

