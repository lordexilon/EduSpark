-- sql_scripts/fix_enrollments_rls_for_institutions.sql
-- Script para corregir las políticas RLS de career_enrollments y course_enrollments
-- Permite que admin-campus, coordinator y teacher vean inscripciones de estudiantes de su institución

-- =====================================================
-- 1. HABILITAR RLS EN LAS TABLAS
-- =====================================================

ALTER TABLE public.career_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. ELIMINAR POLÍTICAS EXISTENTES
-- =====================================================

-- Career enrollments
DROP POLICY IF EXISTS "career_enrollments_admin_all" ON public.career_enrollments;
DROP POLICY IF EXISTS "career_enrollments_student_own" ON public.career_enrollments;
DROP POLICY IF EXISTS "career_enrollments_institution_access" ON public.career_enrollments;
DROP POLICY IF EXISTS "career_enrollments_coordinator_access" ON public.career_enrollments;
DROP POLICY IF EXISTS "career_enrollments_teacher_access" ON public.career_enrollments;

-- Course enrollments
DROP POLICY IF EXISTS "course_enrollments_admin_all" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_student_own" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_institution_access" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_teacher_access" ON public.course_enrollments;

-- =====================================================
-- 3. POLÍTICAS PARA CAREER_ENROLLMENTS
-- =====================================================

-- Admin ve todas las inscripciones
CREATE POLICY "career_enrollments_admin_all" ON public.career_enrollments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Estudiantes ven sus propias inscripciones
CREATE POLICY "career_enrollments_student_own" ON public.career_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Admin-campus, coordinator y teacher ven inscripciones de estudiantes de su institución
CREATE POLICY "career_enrollments_institution_access" ON public.career_enrollments
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
      WHERE ui.user_id = career_enrollments.student_id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Admin-campus, coordinator y teacher pueden crear inscripciones para estudiantes de su institución
CREATE POLICY "career_enrollments_institution_insert" ON public.career_enrollments
  FOR INSERT
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
      WHERE ui.user_id = career_enrollments.student_id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Admin-campus, coordinator y teacher pueden actualizar inscripciones de estudiantes de su institución
CREATE POLICY "career_enrollments_institution_update" ON public.career_enrollments
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
      WHERE ui.user_id = career_enrollments.student_id
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
      WHERE ui.user_id = career_enrollments.student_id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- =====================================================
-- 4. POLÍTICAS PARA COURSE_ENROLLMENTS
-- =====================================================

-- Admin ve todas las inscripciones
CREATE POLICY "course_enrollments_admin_all" ON public.course_enrollments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Estudiantes ven sus propias inscripciones
CREATE POLICY "course_enrollments_student_own" ON public.course_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Admin-campus, coordinator y teacher ven inscripciones de estudiantes de su institución
CREATE POLICY "course_enrollments_institution_access" ON public.course_enrollments
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
      WHERE ui.user_id = course_enrollments.student_id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Admin-campus, coordinator y teacher pueden crear inscripciones para estudiantes de su institución
CREATE POLICY "course_enrollments_institution_insert" ON public.course_enrollments
  FOR INSERT
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
      WHERE ui.user_id = course_enrollments.student_id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Admin-campus, coordinator y teacher pueden actualizar inscripciones de estudiantes de su institución
CREATE POLICY "course_enrollments_institution_update" ON public.course_enrollments
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
      WHERE ui.user_id = course_enrollments.student_id
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
      WHERE ui.user_id = course_enrollments.student_id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- =====================================================
-- 5. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS ACTUALIZADAS PARA ENROLLMENTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas creadas para career_enrollments:';
  RAISE NOTICE '   - career_enrollments_admin_all: Admin ve todas';
  RAISE NOTICE '   - career_enrollments_student_own: Estudiantes ven las suyas';
  RAISE NOTICE '   - career_enrollments_institution_access: Admin-campus/coordinator/teacher ven de su institución';
  RAISE NOTICE '   - career_enrollments_institution_insert: Pueden crear para estudiantes de su institución';
  RAISE NOTICE '   - career_enrollments_institution_update: Pueden actualizar de estudiantes de su institución';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas creadas para course_enrollments:';
  RAISE NOTICE '   - course_enrollments_admin_all: Admin ve todas';
  RAISE NOTICE '   - course_enrollments_student_own: Estudiantes ven las suyas';
  RAISE NOTICE '   - course_enrollments_institution_access: Admin-campus/coordinator/teacher ven de su institución';
  RAISE NOTICE '   - course_enrollments_institution_insert: Pueden crear para estudiantes de su institución';
  RAISE NOTICE '   - course_enrollments_institution_update: Pueden actualizar de estudiantes de su institución';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   - Asegúrate de que todos los usuarios tengan una institución asignada';
  RAISE NOTICE '   - Ejecuta ensure_users_have_institution.sql para verificar';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

