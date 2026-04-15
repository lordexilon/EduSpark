-- =====================================================
-- Script: Verificar y corregir institución del estudiante
-- Descripción: Verifica si el estudiante tiene institución asignada y la corrige si es necesario
-- =====================================================

-- 1. Verificar si el estudiante tiene institución asignada
SELECT 
  'Verificación de estudiante' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.institution_id,
  ui.is_primary,
  i.name as institution_name
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN institutions i ON i.id = ui.institution_id
WHERE u.id = '228e43a9-d78d-4117-ab00-a01a39df51d3';

-- 2. Verificar todas las entradas de user_institutions para este estudiante
SELECT 
  'Todas las instituciones del estudiante' as check_type,
  ui.*,
  i.name as institution_name
FROM user_institutions ui
LEFT JOIN institutions i ON i.id = ui.institution_id
WHERE ui.user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3';

-- 3. Si el estudiante NO tiene institución asignada, asignarlo a la institución 2
-- Primero verificar si ya existe una entrada
DO $$
DECLARE
  student_user_id UUID := '228e43a9-d78d-4117-ab00-a01a39df51d3';
  institution_id_val INTEGER := 2;
  existing_entry INTEGER;
BEGIN
  -- Verificar si ya existe una entrada
  SELECT COUNT(*) INTO existing_entry
  FROM user_institutions
  WHERE user_id = student_user_id
    AND institution_id = institution_id_val;

  IF existing_entry = 0 THEN
    -- Crear la entrada
    INSERT INTO user_institutions (user_id, institution_id, is_primary, joined_at)
    VALUES (student_user_id, institution_id_val, true, NOW())
    ON CONFLICT (user_id, institution_id) 
    DO UPDATE SET 
      is_primary = true,
      joined_at = COALESCE(user_institutions.joined_at, NOW());
    
    RAISE NOTICE '✅ Estudiante asignado a la institución 2';
  ELSE
    -- Actualizar para que sea primaria
    UPDATE user_institutions
    SET is_primary = true
    WHERE user_id = student_user_id
      AND institution_id = institution_id_val;
    
    RAISE NOTICE '✅ Entrada existente actualizada para ser primaria';
  END IF;

  -- Si el estudiante tenía otra institución como primaria, desmarcarla
  UPDATE user_institutions
  SET is_primary = false
  WHERE user_id = student_user_id
    AND institution_id != institution_id_val
    AND is_primary = true;

  RAISE NOTICE '✅ Otras instituciones desmarcadas como primarias';
END $$;

-- 4. Verificar el resultado final
SELECT 
  'Verificación final' as check_type,
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
WHERE ui.user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
  AND ui.is_primary = true;

-- 5. Verificar que ahora el supervisor puede ver al estudiante
SELECT 
  'Estudiantes visibles para supervisor' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.institution_id,
  i.name as institution_name
FROM users u
JOIN roles r ON r.id = u.role_id
JOIN user_institutions ui ON ui.user_id = u.id
JOIN institutions i ON i.id = ui.institution_id
WHERE ui.institution_id = 2
  AND r.name = 'student'
  AND ui.is_primary = true;

