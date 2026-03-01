-- =====================================================
-- Script: Asignar estudiante a institución
-- Descripción: Asigna un estudiante a la institución 2 (Centro de Estudio Cavavelos)
-- =====================================================

-- IMPORTANTE: Reemplaza 'ESTUDIANTE_USER_ID' con el ID real del estudiante
-- Puedes obtener el ID del estudiante con:
-- SELECT id, email, first_name, last_name FROM users WHERE email = 'email_del_estudiante@ejemplo.com';

-- 1. Verificar el estudiante antes de asignar
SELECT 
  'Student to Assign' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.institution_id as current_institution_id,
  i.name as current_institution_name
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN institutions i ON i.id = ui.institution_id
WHERE u.id = 'ESTUDIANTE_USER_ID'  -- ⚠️ REEMPLAZAR CON EL ID REAL
  AND r.name = 'student';

-- 2. Asignar estudiante a la institución 2
-- Si el estudiante ya tiene una institución, esto la actualizará
INSERT INTO user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES (
  'ESTUDIANTE_USER_ID',  -- ⚠️ REEMPLAZAR CON EL ID REAL DEL ESTUDIANTE
  2,  -- ID de Centro de Estudio Cavavelos
  true,
  NOW()
)
ON CONFLICT (user_id, institution_id) 
DO UPDATE SET 
  is_primary = true,
  joined_at = COALESCE(user_institutions.joined_at, NOW());

-- 3. Si el estudiante tenía otra institución como primaria, desmarcarla
UPDATE user_institutions
SET is_primary = false
WHERE user_id = 'ESTUDIANTE_USER_ID'  -- ⚠️ REEMPLAZAR CON EL ID REAL
  AND institution_id != 2
  AND is_primary = true;

-- 4. Verificar que se asignó correctamente
SELECT 
  'Verification' as check_type,
  ui.user_id,
  ui.institution_id,
  ui.is_primary,
  i.name as institution_name,
  u.email as student_email,
  u.first_name,
  u.last_name
FROM user_institutions ui
JOIN institutions i ON i.id = ui.institution_id
JOIN users u ON u.id = ui.user_id
WHERE ui.user_id = 'ESTUDIANTE_USER_ID'  -- ⚠️ REEMPLAZAR CON EL ID REAL
  AND ui.is_primary = true;

-- =====================================================
-- EJEMPLO: Asignar múltiples estudiantes a la vez
-- =====================================================

/*
-- Si tienes varios estudiantes que necesitas asignar, puedes usar:

INSERT INTO user_institutions (user_id, institution_id, is_primary, joined_at)
SELECT 
  u.id,
  2,  -- ID de Centro de Estudio Cavavelos
  true,
  NOW()
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name = 'student'
  AND u.email IN (
    'estudiante1@ejemplo.com',
    'estudiante2@ejemplo.com',
    'estudiante3@ejemplo.com'
  )
ON CONFLICT (user_id, institution_id) 
DO UPDATE SET 
  is_primary = true,
  joined_at = COALESCE(user_institutions.joined_at, NOW());
*/

