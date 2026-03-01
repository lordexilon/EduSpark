-- ============================================
-- FASE 1: POLÍTICAS RLS
-- ============================================

-- 1. RLS PARA CARRERAS
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "coordinators_manage_own_careers" ON public.careers;
DROP POLICY IF EXISTS "everyone_reads_active_careers" ON public.careers;

-- Coordinadores pueden gestionar sus carreras
CREATE POLICY "coordinators_manage_own_careers"
  ON public.careers FOR ALL
  USING (
    coordinator_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users u 
      JOIN public.roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- Todos pueden leer carreras activas
CREATE POLICY "everyone_reads_active_careers"
  ON public.careers FOR SELECT
  USING (is_active = true);

-- 2. RLS PARA MATERIAS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "coordinators_manage_subjects" ON public.subjects;
DROP POLICY IF EXISTS "everyone_reads_subjects" ON public.subjects;

-- Coordinadores y admin pueden gestionar materias
CREATE POLICY "coordinators_manage_subjects"
  ON public.subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.careers c
      WHERE c.id = subjects.career_id 
      AND (c.coordinator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE u.id = auth.uid() AND r.name = 'admin'
      ))
    )
  );

-- Todos pueden leer materias
CREATE POLICY "everyone_reads_subjects"
  ON public.subjects FOR SELECT
  USING (true);

-- 3. RLS PARA MATRICULACIÓN EN CARRERAS
ALTER TABLE public.career_enrollments ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "students_view_own_career_enrollments" ON public.career_enrollments;
DROP POLICY IF EXISTS "coordinators_view_career_enrollments" ON public.career_enrollments;
DROP POLICY IF EXISTS "students_enroll_in_careers" ON public.career_enrollments;

-- Estudiantes ven sus propias matriculaciones
CREATE POLICY "students_view_own_career_enrollments"
  ON public.career_enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Coordinadores ven matriculaciones de sus carreras
CREATE POLICY "coordinators_view_career_enrollments"
  ON public.career_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.careers c
      WHERE c.id = career_enrollments.career_id
      AND (c.coordinator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE u.id = auth.uid() AND r.name = 'admin'
      ))
    )
  );

-- Estudiantes pueden matricularse
CREATE POLICY "students_enroll_in_careers"
  ON public.career_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- 4. RLS PARA INSCRIPCIÓN EN CURSOS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "students_view_own_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "teachers_view_course_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "admins_view_all_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "students_enroll_in_courses" ON public.course_enrollments;
DROP POLICY IF EXISTS "teachers_update_course_enrollments" ON public.course_enrollments;

-- Estudiantes ven sus propias inscripciones
CREATE POLICY "students_view_own_enrollments"
  ON public.course_enrollments FOR SELECT
  USING (student_id = auth.uid());

-- Docentes ven inscripciones de sus cursos
CREATE POLICY "teachers_view_course_enrollments"
  ON public.course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_enrollments.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- Coordinadores y admin ven todas
CREATE POLICY "admins_view_all_enrollments"
  ON public.course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      JOIN public.roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
    )
  );

-- Estudiantes pueden inscribirse (con validaciones en aplicación)
CREATE POLICY "students_enroll_in_courses"
  ON public.course_enrollments FOR INSERT
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
  );

-- 5. RLS PARA ASIGNACIONES DOCENTE-MATERIA
ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "coordinators_manage_assignments" ON public.subject_assignments;
DROP POLICY IF EXISTS "teachers_view_own_assignments" ON public.subject_assignments;

-- Coordinadores y admin gestionan asignaciones
CREATE POLICY "coordinators_manage_assignments"
  ON public.subject_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.subjects s
      JOIN public.careers c ON s.career_id = c.id
      WHERE s.id = subject_assignments.subject_id 
      AND (c.coordinator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE u.id = auth.uid() AND r.name = 'admin'
      ))
    )
  );

-- Docentes ven sus propias asignaciones
CREATE POLICY "teachers_view_own_assignments"
  ON public.subject_assignments FOR SELECT
  USING (teacher_id = auth.uid());

-- Verificar políticas creadas
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('careers', 'subjects', 'career_enrollments', 'course_enrollments', 'subject_assignments')
ORDER BY tablename, policyname;

