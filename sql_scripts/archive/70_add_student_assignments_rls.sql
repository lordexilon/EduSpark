-- 70_add_student_assignments_rls.sql
-- Agregar políticas RLS para que estudiantes puedan ver tareas de cursos en los que están inscritos

-- Verificar si las tablas existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
    
    -- Política para que estudiantes puedan ver tareas de cursos en los que están inscritos
    DROP POLICY IF EXISTS "students_can_view_enrolled_course_assignments" ON public.assignments;
    
    CREATE POLICY "students_can_view_enrolled_course_assignments"
    ON public.assignments FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM course_enrollments ce
        WHERE ce.course_id = assignments.course_id
          AND ce.student_id = auth.uid()
          AND ce.status = 'active'
      )
    );
    
    RAISE NOTICE '✓ Política "students_can_view_enrolled_course_assignments creada para assignments';
  ELSE
    RAISE NOTICE '⚠ Tabla assignments no existe, omitiendo políticas';
  END IF;
END $$;

-- Verificar políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'assignments'
ORDER BY policyname;

