-- 69_fix_course_enrollments_recursion.sql
-- Corrige la recursión infinita en course_enrollments causada por la política de courses
-- que consulta course_enrollments mientras course_enrollments consulta courses

-- =====================================================
-- PROBLEMA IDENTIFICADO
-- =====================================================
-- La política "teachers_view_course_enrollments" en course_enrollments consulta courses
-- La política "students_can_view_enrolled_courses" en courses consulta course_enrollments
-- Esto crea un ciclo infinito cuando PostgreSQL evalúa las políticas RLS

-- =====================================================
-- SOLUCIÓN: Simplificar la política de courses
-- =====================================================
-- En lugar de consultar course_enrollments desde courses, simplemente permitir
-- que los estudiantes lean courses si tienen alguna inscripción activa usando
-- una función SECURITY DEFINER que evita la recursión

-- Función helper para verificar inscripciones SIN activar RLS recursivo
-- SECURITY DEFINER permite leer course_enrollments sin evaluar políticas RLS
CREATE OR REPLACE FUNCTION public.student_is_enrolled_in_course(
  p_student_id UUID,
  p_course_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Esta función usa SECURITY DEFINER para bypass RLS y evitar recursión
  -- No evaluará políticas RLS de course_enrollments porque se ejecuta con
  -- los privilegios del dueño de la función (generalmente postgres/admin)
  RETURN EXISTS (
    SELECT 1 
    FROM course_enrollments
    WHERE student_id = p_student_id
      AND course_id = p_course_id
      AND status = 'active'
  );
END;
$$;

-- Eliminar y recrear la política de courses para estudiantes
DROP POLICY IF EXISTS "students_can_view_enrolled_courses" ON public.courses;

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
  -- Usar función SECURITY DEFINER para evitar recursión
  public.student_is_enrolled_in_course(auth.uid(), courses.id)
);

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
WHERE tablename = 'courses'
  AND schemaname = 'public'
  AND policyname = 'students_can_view_enrolled_courses';

