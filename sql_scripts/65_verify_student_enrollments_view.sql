-- 65_verify_student_enrollments_view.sql
-- Verifica que un estudiante puede ver sus propias inscripciones
-- Ejecutar en el SQL Editor de Supabase después de autenticarse como el estudiante

-- =====================================================
-- PASO 1: VERIFICAR INSCRIPCIONES EN CARRERAS
-- =====================================================

-- Obtener el ID del usuario estudiante
-- Reemplaza 'miguec@gmail.com' con el email del estudiante si es diferente
SELECT 
  'Usuario estudiante' as verificacion,
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name
FROM public.users u
JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'miguec@gmail.com';

-- Verificar inscripciones en carreras (usando el ID del usuario arriba)
-- Reemplaza 'USER_ID_AQUI' con el ID obtenido arriba
SELECT 
  'Inscripciones en carreras' as verificacion,
  ce.id,
  ce.student_id,
  ce.career_id,
  c.name as career_name,
  ce.status,
  ce.current_semester,
  ce.enrollment_date
FROM public.career_enrollments ce
JOIN public.careers c ON ce.career_id = c.id
WHERE ce.student_id = (SELECT id FROM public.users WHERE email = 'miguec@gmail.com');

-- =====================================================
-- PASO 2: VERIFICAR INSCRIPCIONES EN CURSOS
-- =====================================================

SELECT 
  'Inscripciones en cursos' as verificacion,
  ce.id,
  ce.student_id,
  ce.course_id,
  co.title as course_title,
  co.code as course_code,
  ce.status,
  ce.completion_percentage,
  ce.enrollment_date
FROM public.course_enrollments ce
JOIN public.courses co ON ce.course_id = co.id
WHERE ce.student_id = (SELECT id FROM public.users WHERE email = 'miguec@gmail.com');

-- =====================================================
-- PASO 3: VERIFICAR POLÍTICAS RLS PARA SELECT
-- =====================================================

SELECT 
  'Políticas SELECT para career_enrollments' as verificacion,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'Sin condición USING'
    ELSE 'Con condición USING'
  END as tiene_using,
  CASE 
    WHEN with_check IS NULL THEN 'Sin condición WITH CHECK'
    ELSE 'Con condición WITH CHECK'
  END as tiene_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'career_enrollments'
  AND cmd = 'SELECT'
ORDER BY policyname;

SELECT 
  'Políticas SELECT para course_enrollments' as verificacion,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'Sin condición USING'
    ELSE 'Con condición USING'
  END as tiene_using,
  CASE 
    WHEN with_check IS NULL THEN 'Sin condición WITH CHECK'
    ELSE 'Con condición WITH CHECK'
  END as tiene_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'course_enrollments'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DE INSCRIPCIONES DEL ESTUDIANTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Este script verifica:';
  RAISE NOTICE '  1. Los datos del usuario estudiante';
  RAISE NOTICE '  2. Sus inscripciones en carreras';
  RAISE NOTICE '  3. Sus inscripciones en cursos';
  RAISE NOTICE '  4. Las políticas RLS que permiten ver las inscripciones';
  RAISE NOTICE '';
  RAISE NOTICE 'Si las inscripciones aparecen aquí pero no en el frontend,';
  RAISE NOTICE 'el problema está en cómo se están obteniendo los datos.';
  RAISE NOTICE '';
END $$;

