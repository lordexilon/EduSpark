-- Script para asignar el estudiante a la institución 2 (Centro de Estudio Cavavelos)
-- Este script corrige el problema de que el estudiante no aparece en la página de gestión

-- =====================================================
-- 1. VERIFICAR ESTADO ACTUAL
-- =====================================================

-- Verificar si el estudiante tiene alguna institución asignada
SELECT 
  'Estado actual del estudiante' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  (
    SELECT json_agg(json_build_object(
      'institution_id', ui.institution_id,
      'is_primary', ui.is_primary,
      'institution_name', i.name
    ))
    FROM public.user_institutions ui
    LEFT JOIN public.institutions i ON i.id = ui.institution_id
    WHERE ui.user_id = u.id
  ) as instituciones_asignadas
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE u.id = '228e43a9-d78d-4117-ab00-a01a39df51d3';

-- =====================================================
-- 2. ASIGNAR ESTUDIANTE A LA INSTITUCIÓN 2
-- =====================================================

-- Verificar si ya existe una asignación
DO $$
DECLARE
  v_user_id UUID := '228e43a9-d78d-4117-ab00-a01a39df51d3';
  v_institution_id INTEGER := 2;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si ya existe
  SELECT EXISTS(
    SELECT 1 FROM public.user_institutions 
    WHERE user_id = v_user_id AND institution_id = v_institution_id
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    -- Si no existe, crear la asignación como primaria
    INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
    VALUES (v_user_id, v_institution_id, true, NOW());
    
    RAISE NOTICE '✅ Estudiante asignado a la institución 2';
  ELSE
    RAISE NOTICE 'ℹ️ El estudiante ya está asignado a la institución 2';
  END IF;
  
  -- Si tiene otra institución como primaria, actualizar
  UPDATE public.user_institutions
  SET is_primary = false
  WHERE user_id = v_user_id 
    AND institution_id != v_institution_id
    AND is_primary = true;
  
  -- Asegurar que la institución 2 sea primaria
  UPDATE public.user_institutions
  SET is_primary = true
  WHERE user_id = v_user_id 
    AND institution_id = v_institution_id;
    
  RAISE NOTICE '✅ Institución 2 marcada como primaria para el estudiante';
END $$;

-- =====================================================
-- 3. VERIFICAR RESULTADO
-- =====================================================

-- Verificar que el estudiante ahora está en la institución 2
SELECT 
  'Verificación final' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  ui.institution_id,
  i.name as institution_name,
  ui.is_primary
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
JOIN public.user_institutions ui ON ui.user_id = u.id
JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
  AND ui.institution_id = 2;

-- =====================================================
-- 4. VERIFICAR TODOS LOS ESTUDIANTES EN LA INSTITUCIÓN 2
-- =====================================================

SELECT 
  'Todos los estudiantes en institución 2' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  ui.is_primary,
  ui.joined_at
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
JOIN public.user_institutions ui ON ui.user_id = u.id
WHERE r.name = 'student'
  AND ui.institution_id = 2
ORDER BY u.last_name, u.first_name;

