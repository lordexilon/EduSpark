-- 91_diagnosticar_assignments_estudiantes.sql
-- Diagnóstico completo para identificar por qué los estudiantes no ven las tareas

-- 1. Verificar tipos de datos en las tablas
SELECT 
  'assignments' as tabla,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'assignments'
  AND column_name IN ('id', 'course_id', 'unit_id', 'session_id')
ORDER BY ordinal_position;

SELECT 
  'course_enrollments' as tabla,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_enrollments'
  AND column_name IN ('id', 'student_id', 'course_id', 'status')
ORDER BY ordinal_position;

SELECT 
  'courses' as tabla,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'courses'
  AND column_name IN ('id', 'teacher_id')
ORDER BY ordinal_position;

-- 2. Verificar tareas existentes
SELECT 
  COUNT(*) as total_assignments,
  COUNT(DISTINCT course_id) as cursos_con_tareas
FROM public.assignments;

-- 3. Verificar inscripciones de estudiantes
SELECT 
  COUNT(*) as total_inscripciones,
  COUNT(DISTINCT student_id) as estudiantes_inscritos,
  COUNT(DISTINCT course_id) as cursos_con_inscripciones,
  COUNT(*) FILTER (WHERE status = 'active') as inscripciones_activas
FROM public.course_enrollments;

-- 4. Verificar coincidencia entre assignments y enrollments
-- (Esto nos dirá si hay tareas en cursos donde hay estudiantes inscritos)
SELECT 
  a.course_id,
  COUNT(DISTINCT a.id) as cantidad_tareas,
  COUNT(DISTINCT ce.student_id) as estudiantes_inscritos,
  COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.status = 'active') as estudiantes_activos
FROM public.assignments a
LEFT JOIN public.course_enrollments ce ON ce.course_id = a.course_id
GROUP BY a.course_id
ORDER BY cantidad_tareas DESC;

-- 5. Verificar estudiantes específicos (reemplaza con IDs reales si es necesario)
-- Mostrar estudiantes con sus inscripciones y tareas disponibles
SELECT 
  u.id as student_id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  COUNT(DISTINCT ce.course_id) FILTER (WHERE ce.status = 'active') as cursos_activos,
  COUNT(DISTINCT a.id) as tareas_disponibles
FROM public.users u
LEFT JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.course_enrollments ce ON ce.student_id = u.id AND ce.status = 'active'
LEFT JOIN public.assignments a ON a.course_id = ce.course_id
WHERE r.name = 'student'
GROUP BY u.id, u.email, u.first_name, u.last_name, r.name
ORDER BY u.email;

-- 6. Verificar un caso específico: tareas de un curso con estudiantes inscritos
SELECT 
  a.id as assignment_id,
  a.title as assignment_title,
  a.course_id,
  c.title as course_title,
  a.due_at,
  COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.status = 'active') as estudiantes_que_deberian_verla
FROM public.assignments a
JOIN public.courses c ON c.id = a.course_id
LEFT JOIN public.course_enrollments ce ON ce.course_id = a.course_id AND ce.status = 'active'
GROUP BY a.id, a.title, a.course_id, c.title, a.due_at
ORDER BY estudiantes_que_deberian_verla DESC, a.created_at DESC
LIMIT 20;

-- 7. Verificar si hay problemas de tipo de dato
-- Comparar course_id de assignments con course_id de course_enrollments
SELECT 
  'assignments' as origen,
  course_id,
  pg_typeof(course_id)::text as tipo_dato
FROM public.assignments
LIMIT 1

UNION ALL

SELECT 
  'course_enrollments' as origen,
  course_id,
  pg_typeof(course_id)::text as tipo_dato
FROM public.course_enrollments
LIMIT 1;

-- 8. Verificar que la política RLS funciona correctamente
-- (Esta consulta simula lo que hace la política)
SELECT 
  a.id,
  a.title,
  a.course_id,
  EXISTS (
    SELECT 1
    FROM public.course_enrollments ce
    WHERE ce.course_id = a.course_id
      AND ce.student_id = 'REEMPLAZA_CON_UUID_DE_ESTUDIANTE'::uuid  -- Reemplazar con UUID real
      AND ce.status = 'active'
  ) as deberia_ver_tarea
FROM public.assignments a
ORDER BY a.created_at DESC
LIMIT 10;

-- 9. Inscripciones detalladas de estudiantes
SELECT 
  ce.id as enrollment_id,
  ce.student_id,
  u.email as student_email,
  ce.course_id,
  c.title as course_title,
  ce.status,
  ce.enrollment_date,
  COUNT(a.id) as tareas_en_curso
FROM public.course_enrollments ce
JOIN public.users u ON u.id = ce.student_id
JOIN public.courses c ON c.id = ce.course_id
LEFT JOIN public.assignments a ON a.course_id = ce.course_id
WHERE ce.status = 'active'
GROUP BY ce.id, ce.student_id, u.email, ce.course_id, c.title, ce.status, ce.enrollment_date
ORDER BY tareas_en_curso DESC, ce.student_id
LIMIT 20;

