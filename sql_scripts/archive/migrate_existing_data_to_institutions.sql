-- sql_scripts/migrate_existing_data_to_institutions.sql
-- Script para migrar usuarios y cursos existentes a instituciones
-- Ejecutar DESPUÉS de implement_institution_based_roles.sql

-- =====================================================
-- 1. CREAR INSTITUCIÓN POR DEFECTO SI NO EXISTE
-- =====================================================

DO $$
DECLARE
  default_institution_id INTEGER;
BEGIN
  -- Crear institución por defecto si no existe
  INSERT INTO public.institutions (name, description, is_active)
  VALUES ('Institución por Defecto', 'Institución para usuarios y cursos sin asignar', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO default_institution_id;

  -- Obtener ID de la institución por defecto
  SELECT id INTO default_institution_id
  FROM public.institutions
  WHERE name = 'Institución por Defecto'
  LIMIT 1;

  RAISE NOTICE 'Institución por defecto ID: %', default_institution_id;
END $$;

-- =====================================================
-- 2. ASIGNAR USUARIOS SIN INSTITUCIÓN
-- =====================================================

-- Asignar todos los usuarios (excepto admin) a la institución por defecto
INSERT INTO public.user_institutions (user_id, institution_id, is_primary)
SELECT 
  u.id,
  COALESCE(
    (SELECT id FROM public.institutions WHERE name = 'Institución por Defecto' LIMIT 1),
    (SELECT id FROM public.institutions ORDER BY id LIMIT 1)
  ),
  true
FROM public.users u
WHERE 
  -- Usuario no tiene institución primaria asignada
  NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui
    WHERE ui.user_id = u.id AND ui.is_primary = true
  )
  -- Y no es admin
  AND NOT EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = u.role_id AND r.name = 'admin'
  )
ON CONFLICT (user_id, institution_id) DO NOTHING;

-- =====================================================
-- 3. ASIGNAR INSTITUTION_ID A CURSOS SIN INSTITUCIÓN
-- =====================================================

-- Asignar institution_id a cursos basado en la institución del teacher
UPDATE public.courses
SET institution_id = (
  SELECT ui.institution_id
  FROM public.user_institutions ui
  WHERE ui.user_id = courses.teacher_id
    AND ui.is_primary = true
  LIMIT 1
)
WHERE institution_id IS NULL
  AND teacher_id IS NOT NULL;

-- Si aún hay cursos sin institución (teacher sin institución), asignar institución por defecto
UPDATE public.courses
SET institution_id = (
  SELECT id FROM public.institutions 
  WHERE name = 'Institución por Defecto' 
  LIMIT 1
)
WHERE institution_id IS NULL;

-- =====================================================
-- 4. VERIFICAR Y REPORTAR
-- =====================================================

DO $$
DECLARE
  users_without_institution INTEGER;
  courses_without_institution INTEGER;
  total_users INTEGER;
  total_courses INTEGER;
BEGIN
  -- Contar usuarios sin institución (excepto admin)
  SELECT COUNT(*) INTO users_without_institution
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_institutions ui
    WHERE ui.user_id = u.id AND ui.is_primary = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = u.role_id AND r.name = 'admin'
  );

  -- Contar cursos sin institución
  SELECT COUNT(*) INTO courses_without_institution
  FROM public.courses
  WHERE institution_id IS NULL;

  -- Contar totales
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO total_courses FROM public.courses;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN DE MIGRACIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de usuarios: %', total_users;
  RAISE NOTICE 'Usuarios sin institución (excepto admin): %', users_without_institution;
  RAISE NOTICE 'Total de cursos: %', total_courses;
  RAISE NOTICE 'Cursos sin institución: %', courses_without_institution;
  RAISE NOTICE '';
  
  IF users_without_institution > 0 THEN
    RAISE WARNING '⚠️ Aún hay % usuario(s) sin institución asignada', users_without_institution;
  ELSE
    RAISE NOTICE '✅ Todos los usuarios tienen institución asignada';
  END IF;

  IF courses_without_institution > 0 THEN
    RAISE WARNING '⚠️ Aún hay % curso(s) sin institución asignada', courses_without_institution;
  ELSE
    RAISE NOTICE '✅ Todos los cursos tienen institución asignada';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 5. MOSTRAR DISTRIBUCIÓN DE USUARIOS POR INSTITUCIÓN
-- =====================================================

SELECT 
  i.name as institucion,
  COUNT(DISTINCT ui.user_id) as total_usuarios,
  COUNT(DISTINCT CASE WHEN r.name = 'admin-campus' THEN ui.user_id END) as admin_campus,
  COUNT(DISTINCT CASE WHEN r.name = 'coordinator' THEN ui.user_id END) as coordinadores,
  COUNT(DISTINCT CASE WHEN r.name = 'teacher' THEN ui.user_id END) as docentes,
  COUNT(DISTINCT CASE WHEN r.name = 'student' THEN ui.user_id END) as estudiantes
FROM public.institutions i
LEFT JOIN public.user_institutions ui ON ui.institution_id = i.id AND ui.is_primary = true
LEFT JOIN public.users u ON u.id = ui.user_id
LEFT JOIN public.roles r ON r.id = u.role_id
GROUP BY i.id, i.name
ORDER BY i.name;

