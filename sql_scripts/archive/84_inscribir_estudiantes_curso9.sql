-- 84_inscribir_estudiantes_curso9.sql
-- Inscribir estudiantes existentes al curso 9 para que puedan ver las unidades migradas

-- Inscribir a los dos estudiantes que ya están en el curso 1, al curso 9
INSERT INTO course_enrollments (student_id, course_id, status, enrollment_date)
VALUES 
  ('228e43a9-d78d-4117-ab00-a01a39df51d3', 9, 'active', CURRENT_DATE),
  ('b72dabe7-9ace-4e50-aa17-f770c5c94c0e', 9, 'active', CURRENT_DATE)
ON CONFLICT (student_id, course_id) 
DO UPDATE SET status = 'active';

-- Verificar las inscripciones creadas
SELECT 
  ce.id,
  ce.student_id,
  u.email,
  ce.course_id,
  c.title as curso_titulo,
  ce.status
FROM course_enrollments ce
JOIN users u ON u.id = ce.student_id
JOIN courses c ON c.id = ce.course_id
WHERE ce.course_id = 9
ORDER BY ce.enrollment_date DESC;

