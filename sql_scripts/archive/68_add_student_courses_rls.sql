-- 68_add_student_courses_rls.sql
-- Agregar política RLS para que estudiantes puedan leer cursos en los que están inscritos

-- =====================================================
-- POLÍTICA RLS PARA ESTUDIANTES EN COURSES
-- =====================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "students_can_view_enrolled_courses" ON public.courses;

-- Permitir que estudiantes lean cursos en los que están inscritos
CREATE POLICY "students_can_view_enrolled_courses"
ON public.courses
FOR SELECT
USING (
  -- Admin puede ver todo (ya existe otra política)
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  )
  OR
  -- Teacher puede ver sus propios cursos (ya existe otra política)
  teacher_id = auth.uid()
  OR
  -- Estudiante puede ver cursos en los que está inscrito
  EXISTS (
    SELECT 1 
    FROM public.course_enrollments ce
    WHERE ce.course_id = courses.id
      AND ce.student_id = auth.uid()
      AND ce.status = 'active'
  )
);

-- =====================================================
-- POLÍTICA RLS PARA ESTUDIANTES EN STUDENT_LEARNING_PROFILES
-- =====================================================

-- Si la tabla existe, asegurar que los estudiantes puedan leer sus propios perfiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'student_learning_profiles'
  ) THEN
    -- Permitir que estudiantes lean su propio perfil
    DROP POLICY IF EXISTS "students_can_view_own_profile" ON public.student_learning_profiles;
    CREATE POLICY "students_can_view_own_profile"
    ON public.student_learning_profiles
    FOR SELECT
    USING (
      student_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON r.id = u.role_id
        WHERE u.id = auth.uid() AND r.name IN ('admin', 'teacher')
      )
    );

    -- Permitir que estudiantes inserten/actualicen su propio perfil
    DROP POLICY IF EXISTS "students_can_manage_own_profile" ON public.student_learning_profiles;
    CREATE POLICY "students_can_manage_own_profile"
    ON public.student_learning_profiles
    FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('courses', 'student_learning_profiles')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

