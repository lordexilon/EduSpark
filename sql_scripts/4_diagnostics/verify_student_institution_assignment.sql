-- Script para verificar y corregir la asignación de estudiantes a instituciones
-- Este script ayuda a diagnosticar por qué los estudiantes no aparecen en la página de gestión

-- =====================================================
-- 1. VERIFICAR ESTUDIANTES EN LA INSTITUCIÓN 2
-- =====================================================

-- Ver todos los usuarios de la institución 2
SELECT 
  'Usuarios en institución 2' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  r.id as role_id,
  ui.institution_id,
  ui.is_primary
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
JOIN public.user_institutions ui ON ui.user_id = u.id
WHERE ui.institution_id = 2
ORDER BY r.name, u.last_name, u.first_name;

-- =====================================================
-- 2. VERIFICAR ESTUDIANTES SIN INSTITUCIÓN
-- =====================================================

-- Estudiantes que NO tienen institución asignada
SELECT 
  'Estudiantes sin institución' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.name = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui 
    WHERE ui.user_id = u.id
  )
ORDER BY u.last_name, u.first_name;

-- =====================================================
-- 3. VERIFICAR EL ESTUDIANTE ESPECÍFICO
-- =====================================================

-- Verificar el estudiante 228e43a9-d78d-4117-ab00-a01a39df51d3
SELECT 
  'Verificación del estudiante' as check_type,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  r.id as role_id,
  u.is_active,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_institutions ui 
      WHERE ui.user_id = u.id AND ui.institution_id = 2
    ) THEN 'SÍ está en institución 2'
    ELSE 'NO está en institución 2'
  END as institution_status,
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
-- 4. CORREGIR ASIGNACIÓN DEL ESTUDIANTE (SI ES NECESARIO)
-- =====================================================

-- Si el estudiante no está en la institución 2, asignarlo
-- DESCOMENTA Y EJECUTA ESTAS LÍNEAS SI ES NECESARIO:

/*
-- Verificar si ya existe una asignación
SELECT * FROM public.user_institutions 
WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3';

-- Si no existe, crear la asignación
INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
VALUES ('228e43a9-d78d-4117-ab00-a01a39df51d3', 2, true, NOW())
ON CONFLICT (user_id, institution_id) DO NOTHING;

-- Si existe pero en otra institución, actualizar
UPDATE public.user_institutions
SET institution_id = 2, is_primary = true
WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3' AND is_primary = true;
*/

-- =====================================================
-- 5. RESUMEN DE ESTUDIANTES POR INSTITUCIÓN
-- =====================================================

SELECT 
  'Resumen por institución' as check_type,
  i.id as institution_id,
  i.name as institution_name,
  COUNT(DISTINCT CASE WHEN r.name = 'student' THEN u.id END) as total_estudiantes,
  COUNT(DISTINCT CASE WHEN r.name = 'teacher' THEN u.id END) as total_docentes,
  COUNT(DISTINCT CASE WHEN r.name = 'admin-campus' THEN u.id END) as total_admin_campus,
  COUNT(DISTINCT CASE WHEN r.name = 'coordinator' THEN u.id END) as total_coordinadores,
  COUNT(DISTINCT CASE WHEN r.name = 'supervisor' THEN u.id END) as total_supervisores,
  COUNT(DISTINCT u.id) as total_usuarios
FROM public.institutions i
LEFT JOIN public.user_institutions ui ON ui.institution_id = i.id
LEFT JOIN public.users u ON u.id = ui.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
GROUP BY i.id, i.name
ORDER BY i.id;

