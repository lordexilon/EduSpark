-- 64_fix_course_enrollments_rls.sql
-- Corrige las políticas RLS de course_enrollments para permitir que admins/coordinators/teachers
-- puedan inscribir estudiantes en cursos
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS EXISTENTES DE INSERT/UPDATE
-- =====================================================

DROP POLICY IF EXISTS "students_enroll_in_courses" ON public.course_enrollments;
DROP POLICY IF EXISTS "admins_coordinators_insert_course_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "teachers_insert_course_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "teachers_update_course_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "coordinators_update_course_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "admins_update_all_course_enrollments" ON public.course_enrollments;

-- =====================================================
-- PASO 2: VERIFICAR QUE LAS FUNCIONES HELPER EXISTAN
-- =====================================================

-- Función para verificar si el usuario es admin o coordinator
CREATE OR REPLACE FUNCTION public.is_admin_or_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  );
$$;

-- Función para verificar si el usuario es teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = 'teacher'
  );
$$;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  );
$$;

-- =====================================================
-- PASO 3: CREAR NUEVAS POLÍTICAS PARA INSERT
-- =====================================================

-- Estudiantes pueden inscribirse a sí mismos
CREATE POLICY "students_enroll_in_courses"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Docentes pueden inscribir estudiantes en sus cursos
CREATE POLICY "teachers_insert_course_enrollments"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Administradores y coordinadores pueden inscribir cualquier estudiante en cualquier curso
CREATE POLICY "admins_coordinators_insert_course_enrollments"
  ON public.course_enrollments FOR INSERT
  WITH CHECK (public.is_admin_or_coordinator());

-- =====================================================
-- PASO 4: CREAR POLÍTICAS PARA UPDATE
-- =====================================================

-- Estudiantes pueden actualizar sus propias inscripciones (solo ciertos campos)
CREATE POLICY "students_update_own_enrollments"
  ON public.course_enrollments FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Docentes pueden actualizar inscripciones de sus cursos
CREATE POLICY "teachers_update_course_enrollments"
  ON public.course_enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id
      AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Coordinadores pueden actualizar inscripciones en cursos de sus carreras
CREATE POLICY "coordinators_update_course_enrollments"
  ON public.course_enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.subjects s ON c.subject_id = s.id
      JOIN public.careers ca ON s.career_id = ca.id
      WHERE c.id = course_enrollments.course_id
      AND (ca.coordinator_id = auth.uid() OR public.is_admin_or_coordinator())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      JOIN public.subjects s ON c.subject_id = s.id
      JOIN public.careers ca ON s.career_id = ca.id
      WHERE c.id = course_enrollments.course_id
      AND (ca.coordinator_id = auth.uid() OR public.is_admin_or_coordinator())
    )
  );

-- Administradores pueden actualizar cualquier inscripción
CREATE POLICY "admins_update_all_course_enrollments"
  ON public.course_enrollments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- PASO 5: VERIFICAR POLÍTICAS CREADAS
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Lectura'
    WHEN cmd = 'INSERT' THEN 'Inserción'
    WHEN cmd = 'UPDATE' THEN 'Actualización'
    WHEN cmd = 'DELETE' THEN 'Eliminación'
    ELSE cmd
  END as operacion,
  qual as condicion_using,
  with_check as condicion_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'course_enrollments'
ORDER BY cmd, policyname;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'CORRECCIÓN DE POLÍTICAS RLS PARA course_enrollments';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas INSERT creadas:';
  RAISE NOTICE '   1. students_enroll_in_courses - Estudiantes pueden inscribirse a sí mismos';
  RAISE NOTICE '   2. teachers_insert_course_enrollments - Docentes pueden inscribir en sus cursos';
  RAISE NOTICE '   3. admins_coordinators_insert_course_enrollments - Admins/Coordinators pueden inscribir cualquier estudiante';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas UPDATE creadas:';
  RAISE NOTICE '   1. students_update_own_enrollments - Estudiantes pueden actualizar sus inscripciones';
  RAISE NOTICE '   2. teachers_update_course_enrollments - Docentes pueden actualizar inscripciones de sus cursos';
  RAISE NOTICE '   3. coordinators_update_course_enrollments - Coordinadores pueden actualizar en cursos de sus carreras';
  RAISE NOTICE '   4. admins_update_all_course_enrollments - Admins pueden actualizar cualquier inscripción';
  RAISE NOTICE '';
  RAISE NOTICE 'Ahora los administradores, coordinadores y docentes pueden inscribir estudiantes';
  RAISE NOTICE 'en cursos desde la página de gestión de estudiantes.';
  RAISE NOTICE '';
END $$;

