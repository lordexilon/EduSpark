-- =====================================================
-- Script: Diagnosticar estudiantes para supervisor
-- Descripción: Verifica por qué un supervisor no ve estudiantes
-- =====================================================

-- 1. Verificar que el supervisor tiene institución asignada
SELECT 
  'Supervisor Institution Check' as check_type,
  ui.user_id,
  ui.institution_id,
  ui.is_primary,
  i.name as institution_name,
  u.email as supervisor_email,
  r.name as supervisor_role
FROM user_institutions ui
JOIN institutions i ON i.id = ui.institution_id
JOIN users u ON u.id = ui.user_id
JOIN roles r ON r.id = u.role_id
WHERE ui.user_id = 'd41190b5-5bc9-466b-a996-a0970351bfa6'
  AND ui.is_primary = true;

-- 2. Verificar todos los estudiantes de la institución 2
SELECT 
  'Students in Institution 2' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.institution_id,
  ui.is_primary
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN user_institutions ui ON ui.user_id = u.id AND ui.institution_id = 2
WHERE r.name = 'student'
ORDER BY u.last_name, u.first_name;

-- 3. Verificar estudiantes que NO tienen institución asignada
SELECT 
  'Students WITHOUT Institution' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN user_institutions ui ON ui.user_id = u.id
WHERE r.name = 'student'
  AND ui.id IS NULL
ORDER BY u.last_name, u.first_name;

-- 4. Verificar estudiantes que tienen institución pero NO la 2
SELECT 
  'Students in OTHER Institutions' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  ui.institution_id,
  i.name as institution_name
FROM users u
JOIN roles r ON r.id = u.role_id
JOIN user_institutions ui ON ui.user_id = u.id
JOIN institutions i ON i.id = ui.institution_id
WHERE r.name = 'student'
  AND ui.institution_id != 2
ORDER BY ui.institution_id, u.last_name, u.first_name;

-- 5. Contar estudiantes por institución
SELECT 
  'Student Count by Institution' as check_type,
  i.id as institution_id,
  i.name as institution_name,
  COUNT(DISTINCT u.id) as student_count
FROM institutions i
LEFT JOIN user_institutions ui ON ui.institution_id = i.id
LEFT JOIN users u ON u.id = ui.user_id
LEFT JOIN roles r ON r.id = u.role_id AND r.name = 'student'
GROUP BY i.id, i.name
ORDER BY i.id;

-- 6. Verificar el ID del rol 'student'
SELECT 
  'Student Role ID' as check_type,
  id,
  name,
  description
FROM roles
WHERE name = 'student';

