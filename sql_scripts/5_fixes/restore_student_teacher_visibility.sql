-- restore_student_teacher_visibility.sql
-- Restaurar visibilidad para Estudiantes y Profesores de forma segura (sin recursión)

-- 1. Función segura para verificar si un usuario es profesor del estudiante actual
CREATE OR REPLACE FUNCTION public.is_my_teacher(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    -- Buscar coincidencias en inscripciones de cursos
    SELECT 1 
    FROM course_enrollments ce_student
    JOIN courses c ON ce_student.course_id = c.id
    WHERE ce_student.user_id = auth.uid() -- El estudiante soy yo
    AND c.teacher_id = target_user_id -- El objetivo es el profesor del curso
    AND ce_student.status = 'active'
  );
$$;

-- 2. Función segura para verificar si un usuario es estudiante del profesor actual
CREATE OR REPLACE FUNCTION public.is_my_student(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM courses c
    JOIN course_enrollments ce ON c.id = ce.course_id
    WHERE c.teacher_id = auth.uid() -- El profesor soy yo
    AND ce.user_id = target_user_id -- El objetivo es mi estudiante
    AND ce.status = 'active'
  );
$$;

-- 3. Función segura para verificar compañeros de clase
CREATE OR REPLACE FUNCTION public.is_my_classmate(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM course_enrollments ce1
    JOIN course_enrollments ce2 ON ce1.course_id = ce2.course_id
    WHERE ce1.user_id = auth.uid() -- Yo
    AND ce2.user_id = target_user_id -- El otro
    AND ce1.status = 'active' 
    AND ce2.status = 'active'
    AND ce1.user_id != ce2.user_id -- No soy yo mismo
  );
$$;

-- 4. Crear la política de visibilidad académica
CREATE POLICY "Academic visibility (Teachers/Students)" ON public.users
FOR SELECT USING (
  public.is_my_teacher(id) 
  OR public.is_my_student(id)
  OR public.is_my_classmate(id)
);
