-- 66_diagnose_student_enrollments.sql
-- Diagnostica por qué un estudiante no puede ver sus inscripciones
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR USUARIO Y ROL
-- =====================================================

SELECT 
  'Datos del usuario estudiante' as verificacion,
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.is_active,
  r.id as role_id,
  r.name as role_name,
  CASE 
    WHEN u.is_active = false THEN '❌ Usuario INACTIVO'
    WHEN r.name != 'student' THEN '⚠️ Usuario no es estudiante'
    ELSE '✅ Usuario válido'
  END as estado_usuario
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'miguec@gmail.com';

-- =====================================================
-- PASO 2: VERIFICAR INSCRIPCIONES EN CARRERAS (DIRECTO)
-- =====================================================

-- Obtener ID del usuario
WITH user_data AS (
  SELECT id, email FROM public.users WHERE email = 'miguec@gmail.com'
)
SELECT 
  'Inscripciones en carreras (verificación directa)' as verificacion,
  ce.id,
  ce.student_id,
  ce.career_id,
  c.name as career_name,
  c.code as career_code,
  ce.status,
  ce.current_semester,
  ce.enrollment_date,
  ce.created_at
FROM public.career_enrollments ce
JOIN public.careers c ON ce.career_id = c.id
CROSS JOIN user_data ud
WHERE ce.student_id = ud.id
ORDER BY ce.enrollment_date DESC;

-- =====================================================
-- PASO 3: VERIFICAR INSCRIPCIONES EN CURSOS (DIRECTO)
-- =====================================================

WITH user_data AS (
  SELECT id, email FROM public.users WHERE email = 'miguec@gmail.com'
)
SELECT 
  'Inscripciones en cursos (verificación directa)' as verificacion,
  ce.id,
  ce.student_id,
  ce.course_id,
  co.title as course_title,
  co.code as course_code,
  ce.status,
  ce.completion_percentage,
  ce.enrollment_date,
  ce.created_at
FROM public.course_enrollments ce
JOIN public.courses co ON ce.course_id = co.id
CROSS JOIN user_data ud
WHERE ce.student_id = ud.id
ORDER BY ce.enrollment_date DESC;

-- =====================================================
-- PASO 4: SIMULAR CONSULTA CON RLS (usando auth.uid())
-- =====================================================

-- NOTA: Esto requiere ejecutarse mientras estés autenticado como el estudiante
-- O usar SECURITY DEFINER para simular

DO $$
DECLARE
  v_user_id UUID;
  v_career_enrollments_count INTEGER;
  v_course_enrollments_count INTEGER;
BEGIN
  -- Obtener ID del usuario
  SELECT id INTO v_user_id FROM public.users WHERE email = 'miguec@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Usuario miguec@gmail.com no encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Usuario ID: %', v_user_id;
  
  -- Contar inscripciones en carreras
  SELECT COUNT(*) INTO v_career_enrollments_count
  FROM public.career_enrollments
  WHERE student_id = v_user_id;
  
  -- Contar inscripciones en cursos
  SELECT COUNT(*) INTO v_course_enrollments_count
  FROM public.course_enrollments
  WHERE student_id = v_user_id;
  
  RAISE NOTICE 'Inscripciones en carreras: %', v_career_enrollments_count;
  RAISE NOTICE 'Inscripciones en cursos: %', v_course_enrollments_count;
  
  IF v_career_enrollments_count = 0 AND v_course_enrollments_count = 0 THEN
    RAISE NOTICE '⚠️ No se encontraron inscripciones para este usuario';
  ELSIF v_career_enrollments_count > 0 OR v_course_enrollments_count > 0 THEN
    RAISE NOTICE '✅ Se encontraron inscripciones. Si no aparecen en el frontend,';
    RAISE NOTICE '   el problema podría estar en:';
    RAISE NOTICE '   1. Las políticas RLS (verificar que student_id = auth.uid() funcione)';
    RAISE NOTICE '   2. El frontend no está usando los servicios correctos';
    RAISE NOTICE '   3. El usuario no está autenticado correctamente en el frontend';
  END IF;
END $$;

-- =====================================================
-- PASO 5: VERIFICAR POLÍTICAS SELECT ACTUALES
-- =====================================================

SELECT 
  'Políticas SELECT para career_enrollments' as verificacion,
  policyname,
  cmd,
  qual as condicion_using,
  CASE 
    WHEN qual IS NULL THEN '⚠️ Sin condición USING'
    WHEN qual LIKE '%student_id = auth.uid()%' THEN '✅ Usa student_id = auth.uid()'
    ELSE '⚠️ Otra condición'
  END as evaluacion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'career_enrollments'
  AND cmd = 'SELECT'
ORDER BY policyname;

SELECT 
  'Políticas SELECT para course_enrollments' as verificacion,
  policyname,
  cmd,
  qual as condicion_using,
  CASE 
    WHEN qual IS NULL THEN '⚠️ Sin condición USING'
    WHEN qual LIKE '%student_id = auth.uid()%' THEN '✅ Usa student_id = auth.uid()'
    ELSE '⚠️ Otra condición'
  END as evaluacion
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
  RAISE NOTICE 'DIAGNÓSTICO DE INSCRIPCIONES DEL ESTUDIANTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Este script verifica:';
  RAISE NOTICE '  1. Si el usuario existe y está activo';
  RAISE NOTICE '  2. Si tiene inscripciones en carreras y cursos';
  RAISE NOTICE '  3. Si las políticas RLS están correctamente configuradas';
  RAISE NOTICE '';
  RAISE NOTICE 'Si las inscripciones aparecen aquí pero no en el frontend:';
  RAISE NOTICE '  - Verifica que el usuario esté autenticado correctamente';
  RAISE NOTICE '  - Revisa la consola del navegador para errores';
  RAISE NOTICE '  - Verifica que auth.uid() coincida con student_id';
  RAISE NOTICE '';
END $$;

