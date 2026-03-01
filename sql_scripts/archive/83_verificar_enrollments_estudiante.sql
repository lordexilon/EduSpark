-- 83_verificar_enrollments_estudiante.sql
-- Verificar si los estudiantes están inscritos en los cursos

-- 1. Ver todos los enrollments activos
SELECT 
  ce.id,
  ce.student_id,
  u.email,
  ce.course_id,
  c.title as curso_titulo,
  ce.status,
  ce.enrollment_date,
  ce.completion_percentage
FROM course_enrollments ce
JOIN users u ON u.id = ce.student_id
JOIN courses c ON c.id = ce.course_id
ORDER BY ce.course_id, ce.enrollment_date DESC;

-- 2. Ver cursos sin estudiantes inscritos
SELECT 
  c.id,
  c.title,
  COUNT(ce.id) as estudiantes_inscritos
FROM courses c
LEFT JOIN course_enrollments ce ON ce.course_id = c.id AND ce.status = 'active'
GROUP BY c.id, c.title
HAVING COUNT(ce.id) = 0
ORDER BY c.id;

-- 3. Verificar si un estudiante específico (usuario actual autenticado) puede ver el curso 1
-- Esta query simula lo que ve un estudiante inscrito
SELECT 
  c.id as course_id,
  c.title,
  EXISTS (
    SELECT 1 
    FROM course_enrollments ce
    WHERE ce.course_id = c.id
      -- Reemplaza este UUID con el ID del estudiante que quieres verificar
      -- AND ce.student_id = 'TU_UUID_AQUI'
      AND ce.status = 'active'
  ) as puede_ver
FROM courses c
WHERE c.id IN (1, 9)
ORDER BY c.id;

-- 4. Inscribir un estudiante de prueba al curso 1 (si quieres)
-- Descomenta y ajusta el student_id según tu usuario
/*
INSERT INTO course_enrollments (student_id, course_id, status, enrollment_date)
VALUES 
  ('TU_UUID_DE_ESTUDIANTE_AQUI', 1, 'active', CURRENT_DATE)
ON CONFLICT DO NOTHING;
*/

-- 5. Verificar qué usuario está autenticado actualmente en Supabase
-- Esta query muestra el UUID del usuario actual (solo funciona en contexto de autenticación)
-- SELECT auth.uid() as usuario_actual;

