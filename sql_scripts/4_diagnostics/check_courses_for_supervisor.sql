-- =====================================================
-- Script: Verificar cursos para supervisor
-- Descripción: Verifica si hay cursos activos para la institución del supervisor
-- =====================================================

-- 1. Verificar institución del supervisor
SELECT 
  'Institución del supervisor' as check_type,
  u.id as user_id,
  u.email,
  r.name as role_name,
  ui.institution_id,
  i.name as institution_name
FROM public.users u
INNER JOIN public.roles r ON r.id = u.role_id
LEFT JOIN public.user_institutions ui ON ui.user_id = u.id AND ui.is_primary = true
LEFT JOIN public.institutions i ON i.id = ui.institution_id
WHERE u.email = 'aaron.rey.paredes@gmail.com'
  AND r.name = 'supervisor';

-- 2. Verificar TODOS los cursos (sin filtros RLS)
SELECT 
  'Todos los cursos (sin RLS)' as check_type,
  id,
  title,
  code,
  institution_id,
  status,
  teacher_id,
  created_at
FROM public.courses
ORDER BY institution_id, status, created_at DESC;

-- 3. Verificar cursos de la institución 2 (sin RLS)
SELECT 
  'Cursos de institución 2 (sin RLS)' as check_type,
  id,
  title,
  code,
  institution_id,
  status,
  teacher_id,
  created_at
FROM public.courses
WHERE institution_id = 2
ORDER BY status, created_at DESC;

-- 4. Verificar cursos activos de la institución 2 (sin RLS)
SELECT 
  'Cursos activos de institución 2 (sin RLS)' as check_type,
  id,
  title,
  code,
  institution_id,
  status,
  teacher_id,
  created_at
FROM public.courses
WHERE institution_id = 2
  AND status = 'active'
ORDER BY created_at DESC;

-- 5. Contar cursos por institución y estado
SELECT 
  'Conteo de cursos' as check_type,
  institution_id,
  i.name as institution_name,
  status,
  COUNT(*) as total_cursos
FROM public.courses c
LEFT JOIN public.institutions i ON i.id = c.institution_id
GROUP BY institution_id, i.name, status
ORDER BY institution_id, status;

-- 6. Verificar si hay cursos sin institución asignada
SELECT 
  'Cursos sin institución' as check_type,
  id,
  title,
  code,
  institution_id,
  status,
  teacher_id
FROM public.courses
WHERE institution_id IS NULL
ORDER BY created_at DESC;

