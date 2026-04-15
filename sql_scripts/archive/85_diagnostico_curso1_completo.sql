-- 85_diagnostico_curso1_completo.sql
-- Diagnóstico completo del curso 1 para identificar por qué el estudiante no ve contenido

-- =====================================================
-- 1. VERIFICAR DATOS DEL CURSO 1
-- =====================================================
SELECT '=== DATOS DEL CURSO 1 ===' as seccion;

SELECT 
  c.id,
  c.title,
  c.status,
  c.teacher_id,
  u.email as teacher_email,
  COUNT(DISTINCT cu.id) as total_unidades,
  COUNT(DISTINCT s.id) as total_sesiones,
  COUNT(DISTINCT m.id) as total_materiales
FROM courses c
LEFT JOIN users u ON u.id = c.teacher_id
LEFT JOIN course_units cu ON cu.course_id = c.id
LEFT JOIN sessions s ON s.course_id = c.id
LEFT JOIN materials m ON m.course_id = c.id
WHERE c.id = 1
GROUP BY c.id, c.title, c.status, c.teacher_id, u.email;

-- =====================================================
-- 2. VERIFICAR ENROLLMENTS EN CURSO 1
-- =====================================================
SELECT '=== ENROLLMENTS CURSO 1 ===' as seccion;

SELECT 
  ce.id,
  ce.student_id,
  u.email as student_email,
  ce.status,
  ce.enrollment_date,
  ce.completion_percentage
FROM course_enrollments ce
JOIN users u ON u.id = ce.student_id
WHERE ce.course_id = 1;

-- =====================================================
-- 3. VERIFICAR UNIDADES DEL CURSO 1
-- =====================================================
SELECT '=== UNIDADES CURSO 1 ===' as seccion;

SELECT 
  id,
  course_id,
  number,
  title,
  description,
  order_index,
  created_at
FROM course_units
WHERE course_id = 1
ORDER BY number;

-- =====================================================
-- 4. VERIFICAR SESIONES DEL CURSO 1
-- =====================================================
SELECT '=== SESIONES CURSO 1 ===' as seccion;

SELECT 
  id,
  course_id,
  unit_id,
  title,
  objective,
  starts_at,
  order_index
FROM sessions
WHERE course_id = 1
ORDER BY order_index;

-- =====================================================
-- 5. VERIFICAR POLÍTICAS RLS DE COURSE_UNITS
-- =====================================================
SELECT '=== POLÍTICAS RLS COURSE_UNITS ===' as seccion;

SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'course_units'
ORDER BY policyname;

-- =====================================================
-- 6. VERIFICAR POLÍTICAS RLS DE SESSIONS
-- =====================================================
SELECT '=== POLÍTICAS RLS SESSIONS ===' as seccion;

SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'sessions'
ORDER BY policyname;

-- =====================================================
-- 7. VERIFICAR POLÍTICAS RLS DE MATERIALS
-- =====================================================
SELECT '=== POLÍTICAS RLS MATERIALS ===' as seccion;

SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'materials'
ORDER BY policyname;

-- =====================================================
-- 8. TEST DE ACCESO (Simulando un estudiante inscrito)
-- =====================================================
-- Simular la vista de un estudiante inscrito usando el primer student_id del curso 1
SELECT '=== TEST: Qué vería el estudiante miguec@gmail.com ===' as seccion;

WITH estudiante_test AS (
  SELECT student_id 
  FROM course_enrollments 
  WHERE course_id = 1 AND status = 'active' 
  LIMIT 1
)
SELECT 
  cu.id,
  cu.number,
  cu.title,
  'Puede ver unidad' as estado
FROM course_units cu
CROSS JOIN estudiante_test et
WHERE cu.course_id = 1
  -- Simular la política RLS
  AND EXISTS (
    SELECT 1
    FROM course_enrollments ce
    WHERE ce.course_id = cu.course_id
      AND ce.student_id = et.student_id
      AND ce.status = 'active'
  );

-- =====================================================
-- 9. VERIFICAR SI HAY MATERIALES LEGACY (course_materials)
-- =====================================================
SELECT '=== MATERIALES LEGACY (course_materials) CURSO 1 ===' as seccion;

SELECT 
  id,
  course_id,
  title,
  type,
  module_id
FROM course_materials
WHERE course_id = 1;

-- =====================================================
-- 10. VERIFICAR MATERIALES MIGRADOS (materials)
-- =====================================================
SELECT '=== MATERIALES MIGRADOS (materials) CURSO 1 ===' as seccion;

SELECT 
  id,
  course_id,
  unit_id,
  title,
  kind
FROM materials
WHERE course_id = 1;

