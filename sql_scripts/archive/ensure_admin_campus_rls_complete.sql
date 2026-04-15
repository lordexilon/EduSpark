-- sql_scripts/ensure_admin_campus_rls_complete.sql
-- Script para asegurar que admin-campus solo vea datos de su institución
-- Verifica y actualiza todas las políticas RLS necesarias
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- 1. VERIFICAR Y ACTUALIZAR POLÍTICAS PARA CAREERS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "careers_admin_all" ON public.careers;
DROP POLICY IF EXISTS "careers_institution_access" ON public.careers;

-- Admin ve todas las carreras
CREATE POLICY "careers_admin_all" ON public.careers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-campus, coordinador, teacher y student ven carreras de su institución
CREATE POLICY "careers_institution_access" ON public.careers
  FOR ALL
  USING (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  )
  WITH CHECK (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  );

-- =====================================================
-- 2. VERIFICAR Y ACTUALIZAR POLÍTICAS PARA SUBJECTS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_institution_access" ON public.subjects;

-- Admin ve todas las materias
CREATE POLICY "subjects_admin_all" ON public.subjects
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-campus, coordinador, teacher y student ven materias de su institución
CREATE POLICY "subjects_institution_access" ON public.subjects
  FOR ALL
  USING (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  )
  WITH CHECK (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  );

-- =====================================================
-- 3. VERIFICAR POLÍTICAS PARA USERS (Docentes, Coordinadores, Estudiantes)
-- =====================================================

-- Las políticas ya están en implement_institution_based_roles.sql
-- Solo verificamos que existan

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'users_institution_access'
  ) THEN
    RAISE NOTICE '⚠️ Política users_institution_access no existe. Ejecutar implement_institution_based_roles.sql';
  ELSE
    RAISE NOTICE '✅ Política users_institution_access existe';
  END IF;
END $$;

-- =====================================================
-- 4. VERIFICAR POLÍTICAS PARA COURSES
-- =====================================================

-- Las políticas ya están en implement_institution_based_roles.sql
-- Solo verificamos que existan

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'courses' 
    AND policyname = 'courses_institution_access'
  ) THEN
    RAISE NOTICE '⚠️ Política courses_institution_access no existe. Ejecutar implement_institution_based_roles.sql';
  ELSE
    RAISE NOTICE '✅ Política courses_institution_access existe';
  END IF;
END $$;

-- =====================================================
-- 5. VERIFICAR POLÍTICAS PARA SESSIONS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sessions' 
    AND policyname = 'sessions_institution_access'
  ) THEN
    RAISE NOTICE '⚠️ Política sessions_institution_access no existe. Ejecutar implement_institution_based_roles.sql';
  ELSE
    RAISE NOTICE '✅ Política sessions_institution_access existe';
  END IF;
END $$;

-- =====================================================
-- 6. VERIFICAR POLÍTICAS PARA MATERIALS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'materials' 
    AND policyname = 'materials_institution_access'
  ) THEN
    RAISE NOTICE '⚠️ Política materials_institution_access no existe. Ejecutar implement_institution_based_roles.sql';
  ELSE
    RAISE NOTICE '✅ Política materials_institution_access existe';
  END IF;
END $$;

-- =====================================================
-- 7. VERIFICAR POLÍTICAS PARA INSTITUTIONS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'institutions' 
    AND policyname = 'institutions_institution_access'
  ) THEN
    RAISE NOTICE '⚠️ Política institutions_institution_access no existe. Ejecutar implement_institution_based_roles.sql';
  ELSE
    RAISE NOTICE '✅ Política institutions_institution_access existe';
  END IF;
END $$;

-- =====================================================
-- 8. RESUMEN DE POLÍTICAS PARA ADMIN-CAMPUS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE POLÍTICAS RLS PARA ADMIN-CAMPUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin-campus puede ver y gestionar SOLO datos de su institución:';
  RAISE NOTICE '  ✅ Su institución (institutions)';
  RAISE NOTICE '  ✅ Usuarios de su institución (users)';
  RAISE NOTICE '  ✅ Carreras de su institución (careers)';
  RAISE NOTICE '  ✅ Materias de su institución (subjects)';
  RAISE NOTICE '  ✅ Cursos de su institución (courses)';
  RAISE NOTICE '  ✅ Sesiones de cursos de su institución (sessions)';
  RAISE NOTICE '  ✅ Materiales de cursos de su institución (materials)';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin-campus NO puede ver:';
  RAISE NOTICE '  ❌ Datos de otras instituciones';
  RAISE NOTICE '  ❌ Módulos del sistema (solo admin global)';
  RAISE NOTICE '  ❌ Consumo de IA global (solo admin global)';
  RAISE NOTICE '  ❌ Costos de procesamiento global (solo admin global)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

