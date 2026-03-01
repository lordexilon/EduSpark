-- 67_verify_enrollment_student_id.sql
-- Verifica que el student_id en las inscripciones coincida con el id del usuario
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: OBTENER ID DEL USUARIO
-- =====================================================

SELECT 
  'ID del usuario miguec@gmail.com' as verificacion,
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name
FROM public.users u
WHERE u.email = 'miguec@gmail.com';

-- =====================================================
-- PASO 2: VERIFICAR INSCRIPCIONES Y SUS student_id
-- =====================================================

-- Inscripciones en carreras
SELECT 
  'Inscripciones en carreras - Verificación de IDs' as verificacion,
  ce.id as enrollment_id,
  ce.student_id,
  u.id as user_id_from_users_table,
  u.email,
  CASE 
    WHEN ce.student_id = u.id THEN '✅ IDs coinciden'
    ELSE '❌ IDs NO coinciden'
  END as verificacion_id,
  c.name as career_name,
  ce.status
FROM public.career_enrollments ce
JOIN public.careers c ON ce.career_id = c.id
JOIN public.users u ON u.email = 'miguec@gmail.com'
WHERE ce.id IN (
  SELECT ce2.id 
  FROM public.career_enrollments ce2
  JOIN public.users u2 ON ce2.student_id = u2.id
  WHERE u2.email = 'miguec@gmail.com'
)
ORDER BY ce.enrollment_date DESC;

-- Inscripciones en cursos
SELECT 
  'Inscripciones en cursos - Verificación de IDs' as verificacion,
  ce.id as enrollment_id,
  ce.student_id,
  u.id as user_id_from_users_table,
  u.email,
  CASE 
    WHEN ce.student_id = u.id THEN '✅ IDs coinciden'
    ELSE '❌ IDs NO coinciden'
  END as verificacion_id,
  co.title as course_title,
  ce.status
FROM public.course_enrollments ce
JOIN public.courses co ON ce.course_id = co.id
JOIN public.users u ON u.email = 'miguec@gmail.com'
WHERE ce.id IN (
  SELECT ce2.id 
  FROM public.course_enrollments ce2
  JOIN public.users u2 ON ce2.student_id = u2.id
  WHERE u2.email = 'miguec@gmail.com'
)
ORDER BY ce.enrollment_date DESC;

-- =====================================================
-- PASO 3: LISTAR TODAS LAS INSCRIPCIONES (sin filtro de email)
-- =====================================================

-- Ver todas las inscripciones en carreras
SELECT 
  'Todas las inscripciones en carreras' as verificacion,
  ce.id,
  ce.student_id,
  u.email as student_email,
  u.first_name,
  u.last_name,
  c.name as career_name,
  ce.status,
  ce.enrollment_date
FROM public.career_enrollments ce
LEFT JOIN public.users u ON ce.student_id = u.id
LEFT JOIN public.careers c ON ce.career_id = c.id
ORDER BY ce.enrollment_date DESC
LIMIT 10;

-- Ver todas las inscripciones en cursos
SELECT 
  'Todas las inscripciones en cursos' as verificacion,
  ce.id,
  ce.student_id,
  u.email as student_email,
  u.first_name,
  u.last_name,
  co.title as course_title,
  ce.status,
  ce.enrollment_date
FROM public.course_enrollments ce
LEFT JOIN public.users u ON ce.student_id = u.id
LEFT JOIN public.courses co ON ce.course_id = co.id
ORDER BY ce.enrollment_date DESC
LIMIT 10;

-- =====================================================
-- PASO 4: CORREGIR student_id SI ES NECESARIO
-- =====================================================

-- Si las inscripciones tienen un student_id diferente al user_id correcto,
-- este script las corrige:

-- Obtener el user_id correcto
WITH correct_user AS (
  SELECT id FROM public.users WHERE email = 'miguec@gmail.com'
)
UPDATE public.career_enrollments ce
SET student_id = cu.id,
    updated_at = NOW()
FROM correct_user cu
WHERE ce.student_id != cu.id
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = ce.student_id
    AND u.email = 'miguec@gmail.com'
  );

WITH correct_user AS (
  SELECT id FROM public.users WHERE email = 'miguec@gmail.com'
)
UPDATE public.course_enrollments ce
SET student_id = cu.id,
    updated_at = NOW()
FROM correct_user cu
WHERE ce.student_id != cu.id
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = ce.student_id
    AND u.email = 'miguec@gmail.com'
  );

-- =====================================================
-- PASO 5: VERIFICAR DESPUÉS DE LA CORRECCIÓN
-- =====================================================

SELECT 
  'Verificación final - Inscripciones en carreras' as verificacion,
  ce.id,
  ce.student_id,
  u.email,
  CASE 
    WHEN ce.student_id = u.id THEN '✅ Correcto'
    ELSE '❌ Error'
  END as estado,
  c.name as career_name
FROM public.career_enrollments ce
JOIN public.users u ON ce.student_id = u.id
JOIN public.careers c ON ce.career_id = c.id
WHERE u.email = 'miguec@gmail.com';

SELECT 
  'Verificación final - Inscripciones en cursos' as verificacion,
  ce.id,
  ce.student_id,
  u.email,
  CASE 
    WHEN ce.student_id = u.id THEN '✅ Correcto'
    ELSE '❌ Error'
  END as estado,
  co.title as course_title
FROM public.course_enrollments ce
JOIN public.users u ON ce.student_id = u.id
JOIN public.courses co ON ce.course_id = co.id
WHERE u.email = 'miguec@gmail.com';

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN Y CORRECCIÓN DE student_id EN INSCRIPCIONES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Este script verifica que el student_id en las inscripciones';
  RAISE NOTICE 'coincida con el id del usuario en la tabla users.';
  RAISE NOTICE '';
  RAISE NOTICE 'Si hay discrepancias, las corrige automáticamente.';
  RAISE NOTICE '';
END $$;

