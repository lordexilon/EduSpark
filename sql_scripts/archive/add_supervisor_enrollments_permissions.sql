-- Script para agregar permisos de inscripción al rol supervisor
-- Permite que los supervisores inscriban estudiantes de su institución en carreras y cursos

-- =====================================================
-- 1. ACTUALIZAR POLÍTICAS DE CAREER_ENROLLMENTS
-- =====================================================

-- Actualizar política de INSERT para incluir supervisor
DROP POLICY IF EXISTS "career_enrollments_institution_insert" ON public.career_enrollments;

CREATE POLICY "career_enrollments_institution_insert" ON public.career_enrollments
  FOR INSERT
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = career_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  );

-- Actualizar política de UPDATE para incluir supervisor
DROP POLICY IF EXISTS "career_enrollments_institution_update" ON public.career_enrollments;

CREATE POLICY "career_enrollments_institution_update" ON public.career_enrollments
  FOR UPDATE
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = career_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = career_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  );

-- Actualizar política de SELECT para incluir supervisor
DROP POLICY IF EXISTS "career_enrollments_institution_access" ON public.career_enrollments;

CREATE POLICY "career_enrollments_institution_access" ON public.career_enrollments
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = career_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  );

-- =====================================================
-- 2. ACTUALIZAR POLÍTICAS DE COURSE_ENROLLMENTS
-- =====================================================

-- Actualizar política de INSERT para incluir supervisor
DROP POLICY IF EXISTS "course_enrollments_institution_insert" ON public.course_enrollments;

CREATE POLICY "course_enrollments_institution_insert" ON public.course_enrollments
  FOR INSERT
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = course_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  );

-- Actualizar política de UPDATE para incluir supervisor
DROP POLICY IF EXISTS "course_enrollments_institution_update" ON public.course_enrollments;

CREATE POLICY "course_enrollments_institution_update" ON public.course_enrollments
  FOR UPDATE
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = course_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = course_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  );

-- Actualizar política de SELECT para incluir supervisor
DROP POLICY IF EXISTS "course_enrollments_institution_access" ON public.course_enrollments;

CREATE POLICY "course_enrollments_institution_access" ON public.course_enrollments
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher() OR
      public.is_supervisor()
    ) AND
    public.get_user_primary_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = course_enrollments.student_id
        AND ui.institution_id = public.get_user_primary_institution_id()
        AND ui.is_primary = true
    )
  );

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas actualizadas para permitir que supervisores gestionen inscripciones';
  RAISE NOTICE '   - career_enrollments_institution_insert: Supervisor puede crear inscripciones';
  RAISE NOTICE '   - career_enrollments_institution_update: Supervisor puede actualizar inscripciones';
  RAISE NOTICE '   - career_enrollments_institution_access: Supervisor puede ver inscripciones';
  RAISE NOTICE '   - course_enrollments_institution_insert: Supervisor puede crear inscripciones en cursos';
  RAISE NOTICE '   - course_enrollments_institution_update: Supervisor puede actualizar inscripciones en cursos';
  RAISE NOTICE '   - course_enrollments_institution_access: Supervisor puede ver inscripciones en cursos';
END $$;

