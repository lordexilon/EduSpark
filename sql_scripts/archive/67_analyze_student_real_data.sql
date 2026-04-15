-- 67_analyze_student_real_data.sql
-- Analiza los datos REALES que ve miguec@gmail.com
-- Carrera: Lic. AI y Robotica
-- Curso: Matematica para Empresas 1 (ME1-LIAIR)
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: DATOS DEL ESTUDIANTE
-- =====================================================

SELECT 
  '=== DATOS DEL ESTUDIANTE ===' as seccion,
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.is_active,
  r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'miguec@gmail.com';

-- =====================================================
-- PASO 2: CARRERA EN LA QUE ESTÁ INSCRITO
-- =====================================================

SELECT 
  '=== CARRERA INSCRITA ===' as seccion,
  ce.id as enrollment_id,
  ce.status as enrollment_status,
  ce.current_semester,
  ce.enrollment_date,
  c.id as career_id,
  c.name as career_name,
  c.code as career_code,
  c.description as career_description,
  c.duration_months,
  c.total_credits,
  c.degree_type,
  c.is_active as career_active
FROM public.career_enrollments ce
JOIN public.careers c ON ce.career_id = c.id
WHERE ce.student_id = (SELECT id FROM public.users WHERE email = 'miguec@gmail.com')
ORDER BY ce.enrollment_date DESC;

-- =====================================================
-- PASO 3: CURSO EN EL QUE ESTÁ INSCRITO
-- =====================================================

SELECT 
  '=== CURSO INSCRITO ===' as seccion,
  ce.id as enrollment_id,
  ce.status as enrollment_status,
  ce.completion_percentage,
  ce.enrollment_date,
  co.id as course_id,
  co.title as course_title,
  co.code as course_code,
  co.description as course_description,
  co.status as course_status,
  co.teacher_id,
  co.subject_id,
  co.academic_period,
  co.start_date,
  co.end_date,
  co.max_students,
  sub.name as subject_name,
  sub.code as subject_code,
  sub.career_id as subject_career_id
FROM public.course_enrollments ce
JOIN public.courses co ON ce.course_id = co.id
LEFT JOIN public.subjects sub ON co.subject_id = sub.id
WHERE ce.student_id = (SELECT id FROM public.users WHERE email = 'miguec@gmail.com')
ORDER BY ce.enrollment_date DESC;

-- =====================================================
-- PASO 4: CONTEXTO ACADÉMICO DEL CURSO
-- =====================================================

SELECT 
  '=== CONTEXTO ACADÉMICO DEL CURSO ===' as seccion,
  co.id as course_id,
  co.title as course_title,
  co.code as course_code,
  sub.id as subject_id,
  sub.name as subject_name,
  sub.code as subject_code,
  car.id as career_id,
  car.name as career_name,
  car.code as career_code
FROM public.courses co
LEFT JOIN public.subjects sub ON co.subject_id = sub.id
LEFT JOIN public.careers car ON sub.career_id = car.id
WHERE co.code = 'ME1-LIAIR' OR co.title LIKE '%Matematica%Empresas%'
ORDER BY co.id DESC
LIMIT 5;

-- =====================================================
-- PASO 5: VERIFICAR SI EL CURSO ESTÁ RELACIONADO CON LA CARRERA
-- =====================================================

WITH student_data AS (
  SELECT 
    u.id as student_id,
    ce.career_id as enrolled_career_id
  FROM public.users u
  LEFT JOIN public.career_enrollments ce ON ce.student_id = u.id AND ce.status = 'active'
  WHERE u.email = 'miguec@gmail.com'
  LIMIT 1
),
course_data AS (
  SELECT 
    co.id as course_id,
    co.title as course_title,
    co.code as course_code,
    co.subject_id as course_subject_id,
    sub.career_id as course_career_id
  FROM public.courses co
  LEFT JOIN public.subjects sub ON co.subject_id = sub.id
  WHERE co.code = 'ME1-LIAIR' OR co.title LIKE '%Matematica%Empresas%'
  LIMIT 1
)
SELECT 
  '=== VALIDACIÓN DE RELACIÓN CARRERA-CURSO ===' as seccion,
  sd.student_id,
  sd.enrolled_career_id,
  cd.course_id,
  cd.course_title,
  cd.course_code,
  cd.course_career_id,
  cd.course_subject_id,
  CASE 
    WHEN sd.enrolled_career_id = cd.course_career_id THEN '✅ El curso pertenece a la carrera inscrita'
    WHEN cd.course_career_id IS NULL THEN '⚠️ El curso no tiene carrera asignada (subject sin career)'
    ELSE '⚠️ El curso pertenece a otra carrera'
  END as validacion_relacion
FROM student_data sd
CROSS JOIN course_data cd;

-- =====================================================
-- PASO 6: ESTRUCTURA DEL CURSO (UNIDADES Y SESIONES)
-- =====================================================

SELECT 
  '=== ESTRUCTURA DEL CURSO (UNIDADES) ===' as seccion,
  cu.id as unit_id,
  cu.course_id,
  cu.number as unit_number,
  cu.title as unit_title,
  cu.description as unit_description,
  cu.order_index
FROM public.course_units cu
WHERE cu.course_id = (
  SELECT co.id 
  FROM public.courses co 
  WHERE co.code = 'ME1-LIAIR' OR co.title LIKE '%Matematica%Empresas%'
  LIMIT 1
)
ORDER BY cu.order_index NULLS LAST, cu.number;

SELECT 
  '=== ESTRUCTURA DEL CURSO (SESIONES) ===' as seccion,
  s.id as session_id,
  s.unit_id,
  s.order_index,
  s.title as session_title,
  s.description as session_description,
  s.duration_minutes,
  s.session_type,
  s.starts_at,
  s.ends_at,
  s.created_at
FROM public.sessions s
WHERE s.unit_id IN (
  SELECT cu.id 
  FROM public.course_units cu
  WHERE cu.course_id = (
    SELECT co.id 
    FROM public.courses co 
    WHERE co.code = 'ME1-LIAIR' OR co.title LIKE '%Matematica%Empresas%'
    LIMIT 1
  )
)
ORDER BY s.order_index NULLS LAST, s.created_at;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'ANÁLISIS DE DATOS REALES DEL ESTUDIANTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Este script analiza:';
  RAISE NOTICE '  1. Datos del estudiante miguec@gmail.com';
  RAISE NOTICE '  2. Carrera: Lic. AI y Robotica (inscripción)';
  RAISE NOTICE '  3. Curso: Matematica para Empresas 1 (ME1-LIAIR)';
  RAISE NOTICE '  4. Relación entre carrera y curso';
  RAISE NOTICE '  5. Estructura del curso (unidades y sesiones)';
  RAISE NOTICE '';
  RAISE NOTICE 'Usar estos datos para verificar que el frontend muestre';
  RAISE NOTICE 'la información correcta y no datos estáticos/hardcodeados.';
  RAISE NOTICE '';
END $$;

