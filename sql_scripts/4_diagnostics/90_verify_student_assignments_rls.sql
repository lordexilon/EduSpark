-- 90_verify_student_assignments_rls.sql
-- Verificar y asegurar que los estudiantes puedan ver las tareas de sus cursos

-- 1. Verificar que la política RLS existe para assignments
DO $$
BEGIN
  -- Verificar si la tabla assignments existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
    
    -- Eliminar política existente si existe (para recrearla)
    DROP POLICY IF EXISTS "students_can_view_enrolled_course_assignments" ON public.assignments;
    
    -- Crear política para que estudiantes puedan ver tareas de cursos en los que están inscritos
    CREATE POLICY "students_can_view_enrolled_course_assignments"
    ON public.assignments FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.course_enrollments ce
        WHERE ce.course_id = assignments.course_id
          AND ce.student_id = auth.uid()
          AND ce.status = 'active'
      )
    );
    
    RAISE NOTICE '✓ Política "students_can_view_enrolled_course_assignments" creada/actualizada para assignments';
  ELSE
    RAISE NOTICE '⚠ Tabla assignments no existe';
  END IF;
END $$;

-- 2. Verificar políticas RLS existentes en assignments
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'assignments'
ORDER BY policyname;

-- 3. Verificar que RLS esté habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'assignments';

-- 4. Verificar inscripciones de estudiantes (ejemplo para diagnóstico)
SELECT 
  ce.id,
  ce.student_id,
  u.email as student_email,
  ce.course_id,
  c.title as course_title,
  ce.status,
  ce.enrollment_date
FROM public.course_enrollments ce
JOIN public.users u ON u.id = ce.student_id
JOIN public.courses c ON c.id = ce.course_id
WHERE ce.status = 'active'
LIMIT 10;

-- 5. Verificar tareas existentes
SELECT 
  a.id,
  a.title,
  a.course_id,
  c.title as course_title,
  a.due_at,
  a.created_at
FROM public.assignments a
JOIN public.courses c ON c.id = a.course_id
ORDER BY a.created_at DESC
LIMIT 10;

