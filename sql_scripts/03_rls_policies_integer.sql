-- 03_rls_policies_integer.sql
-- Políticas RLS para esquema con INTEGER en courses

-- Habilitar RLS en todas las tablas
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  );
$$;

-- Función helper para verificar si es teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'teacher'
  );
$$;

-- Políticas para courses
CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "courses_owner_rw" ON public.courses
  FOR ALL USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

-- Políticas para course_units
CREATE POLICY "units_admin_all" ON public.course_units
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "units_owner_rw" ON public.course_units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_units.course_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_units.course_id AND c.teacher_id = auth.uid())
  );

-- Políticas para sessions
CREATE POLICY "sessions_admin_all" ON public.sessions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "sessions_owner_rw" ON public.sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = sessions.course_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = sessions.course_id AND c.teacher_id = auth.uid())
  );

-- Políticas para materials
CREATE POLICY "materials_admin_all" ON public.materials
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "materials_owner_rw" ON public.materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = materials.course_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = materials.course_id AND c.teacher_id = auth.uid())
  );

-- Políticas para assignments
CREATE POLICY "assignments_admin_all" ON public.assignments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "assignments_owner_rw" ON public.assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assignments.course_id AND c.teacher_id = auth.uid())
  );

-- Políticas para assignment_submissions
CREATE POLICY "submissions_admin_all" ON public.assignment_submissions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "submissions_owner_rw" ON public.assignment_submissions
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY "submissions_teacher_rw" ON public.assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_submissions.assignment_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "submissions_teacher_update" ON public.assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_submissions.assignment_id AND c.teacher_id = auth.uid()
    )
  );
