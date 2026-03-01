-- sql_scripts/ensure_users_have_institution.sql
-- Script para asegurar que todos los estudiantes, teachers y coordinadores tengan una institución asignada
-- IMPORTANTE: Todos los estudiantes, teachers y coordinadores DEBEN ser de la misma institución

-- =====================================================
-- 1. VERIFICAR USUARIOS SIN INSTITUCIÓN
-- =====================================================

DO $$
DECLARE
  students_without_institution INTEGER;
  teachers_without_institution INTEGER;
  coordinators_without_institution INTEGER;
  admin_campus_without_institution INTEGER;
BEGIN
  -- Contar estudiantes sin institución
  SELECT COUNT(*) INTO students_without_institution
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE r.name = 'student'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = u.id
    );

  -- Contar teachers sin institución
  SELECT COUNT(*) INTO teachers_without_institution
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE r.name = 'teacher'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = u.id
    );

  -- Contar coordinadores sin institución
  SELECT COUNT(*) INTO coordinators_without_institution
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE r.name = 'coordinator'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = u.id
    );

  -- Contar admin-campus sin institución
  SELECT COUNT(*) INTO admin_campus_without_institution
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE r.name = 'admin-campus'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = u.id
    );

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN DE INSTITUCIONES ASIGNADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Estudiantes sin institución: %', students_without_institution;
  RAISE NOTICE 'Teachers sin institución: %', teachers_without_institution;
  RAISE NOTICE 'Coordinadores sin institución: %', coordinators_without_institution;
  RAISE NOTICE 'Admin-campus sin institución: %', admin_campus_without_institution;
  RAISE NOTICE '';
  
  IF students_without_institution > 0 OR teachers_without_institution > 0 OR 
     coordinators_without_institution > 0 OR admin_campus_without_institution > 0 THEN
    RAISE WARNING '⚠️ HAY USUARIOS SIN INSTITUCIÓN ASIGNADA';
    RAISE NOTICE '';
    RAISE NOTICE 'Se recomienda ejecutar la sección de migración automática (sección 2)';
    RAISE NOTICE 'o asignar manualmente las instituciones a estos usuarios.';
  ELSE
    RAISE NOTICE '✅ Todos los usuarios tienen una institución asignada';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 2. MIGRACIÓN AUTOMÁTICA (OPCIONAL)
-- =====================================================
-- Esta sección asigna automáticamente una institución por defecto
-- a usuarios que no tienen una asignada.
-- DESCOMENTAR Y AJUSTAR EL institution_id SI ES NECESARIO

/*
DO $$
DECLARE
  default_institution_id INTEGER;
  user_record RECORD;
BEGIN
  -- Obtener la primera institución activa como predeterminada
  SELECT id INTO default_institution_id
  FROM public.institutions
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF default_institution_id IS NULL THEN
    RAISE EXCEPTION 'No hay instituciones activas en el sistema. Crea al menos una institución antes de ejecutar esta migración.';
  END IF;

  RAISE NOTICE 'Usando institución por defecto: %', default_institution_id;

  -- Asignar institución a estudiantes sin institución
  FOR user_record IN
    SELECT u.id, u.email, r.name as role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE r.name IN ('student', 'teacher', 'coordinator', 'admin-campus')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_institutions ui
        WHERE ui.user_id = u.id
      )
  LOOP
    INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)
    VALUES (user_record.id, default_institution_id, true, NOW())
    ON CONFLICT (user_id, institution_id) DO NOTHING;
    
    RAISE NOTICE 'Asignada institución % a usuario % (%, %)', 
      default_institution_id, user_record.id, user_record.email, user_record.role_name;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Migración completada';
END $$;
*/

-- =====================================================
-- 3. VERIFICAR QUE TODOS LOS USUARIOS DE UNA INSTITUCIÓN
--    TENGAN LA MISMA INSTITUCIÓN ASIGNADA
-- =====================================================

DO $$
DECLARE
  institution_record RECORD;
  students_count INTEGER;
  teachers_count INTEGER;
  coordinators_count INTEGER;
  admin_campus_count INTEGER;
  total_users INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DISTRIBUCIÓN DE USUARIOS POR INSTITUCIÓN';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  FOR institution_record IN
    SELECT id, name, is_active
    FROM public.institutions
    ORDER BY name
  LOOP
    -- Contar usuarios por rol en esta institución
    SELECT COUNT(*) INTO students_count
    FROM public.user_institutions ui
    JOIN public.users u ON u.id = ui.user_id
    JOIN public.roles r ON r.id = u.role_id
    WHERE ui.institution_id = institution_record.id
      AND ui.is_primary = true
      AND r.name = 'student';

    SELECT COUNT(*) INTO teachers_count
    FROM public.user_institutions ui
    JOIN public.users u ON u.id = ui.user_id
    JOIN public.roles r ON r.id = u.role_id
    WHERE ui.institution_id = institution_record.id
      AND ui.is_primary = true
      AND r.name = 'teacher';

    SELECT COUNT(*) INTO coordinators_count
    FROM public.user_institutions ui
    JOIN public.users u ON u.id = ui.user_id
    JOIN public.roles r ON r.id = u.role_id
    WHERE ui.institution_id = institution_record.id
      AND ui.is_primary = true
      AND r.name = 'coordinator';

    SELECT COUNT(*) INTO admin_campus_count
    FROM public.user_institutions ui
    JOIN public.users u ON u.id = ui.user_id
    JOIN public.roles r ON r.id = u.role_id
    WHERE ui.institution_id = institution_record.id
      AND ui.is_primary = true
      AND r.name = 'admin-campus';

    total_users := students_count + teachers_count + coordinators_count + admin_campus_count;

    IF total_users > 0 THEN
      RAISE NOTICE 'Institución: % (ID: %, Activa: %)', 
        institution_record.name, 
        institution_record.id,
        CASE WHEN institution_record.is_active THEN 'Sí' ELSE 'No' END;
      RAISE NOTICE '  - Estudiantes: %', students_count;
      RAISE NOTICE '  - Teachers: %', teachers_count;
      RAISE NOTICE '  - Coordinadores: %', coordinators_count;
      RAISE NOTICE '  - Admin-campus: %', admin_campus_count;
      RAISE NOTICE '  - Total: %', total_users;
      RAISE NOTICE '';
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 4. VERIFICAR INTEGRIDAD: USUARIOS CON MÚLTIPLES INSTITUCIONES
-- =====================================================

DO $$
DECLARE
  users_with_multiple_institutions INTEGER;
  user_record RECORD;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO users_with_multiple_institutions
  FROM public.user_institutions
  WHERE is_primary = true
  GROUP BY user_id
  HAVING COUNT(*) > 1;

  IF users_with_multiple_institutions > 0 THEN
    RAISE WARNING '⚠️ Hay % usuarios con múltiples instituciones primarias asignadas', users_with_multiple_institutions;
    RAISE NOTICE '';
    RAISE NOTICE 'Usuarios con múltiples instituciones primarias:';
    
    FOR user_record IN
      SELECT user_id, COUNT(*) as institution_count
      FROM public.user_institutions
      WHERE is_primary = true
      GROUP BY user_id
      HAVING COUNT(*) > 1
    LOOP
      RAISE NOTICE '  - Usuario ID: % tiene % instituciones primarias', 
        user_record.user_id, user_record.institution_count;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ Todos los usuarios tienen una sola institución primaria';
  END IF;
END $$;

-- =====================================================
-- 5. RECOMENDACIONES FINALES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECOMENDACIONES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Todos los estudiantes, teachers y coordinadores DEBEN tener';
  RAISE NOTICE '   una institución asignada con is_primary = true';
  RAISE NOTICE '';
  RAISE NOTICE '2. Cada usuario debe tener SOLO UNA institución primaria';
  RAISE NOTICE '';
  RAISE NOTICE '3. Las políticas RLS filtran automáticamente los datos por';
  RAISE NOTICE '   institución, asegurando que cada rol solo vea datos de su';
  RAISE NOTICE '   institución';
  RAISE NOTICE '';
  RAISE NOTICE '4. Para asignar una institución a un usuario:';
  RAISE NOTICE '   INSERT INTO public.user_institutions (user_id, institution_id, is_primary, joined_at)';
  RAISE NOTICE '   VALUES (''user_id'', institution_id, true, NOW());';
  RAISE NOTICE '';
  RAISE NOTICE '5. Para cambiar la institución primaria de un usuario:';
  RAISE NOTICE '   -- Primero desmarcar todas como primarias';
  RAISE NOTICE '   UPDATE public.user_institutions SET is_primary = false WHERE user_id = ''user_id'';';
  RAISE NOTICE '   -- Luego marcar la nueva como primaria';
  RAISE NOTICE '   UPDATE public.user_institutions SET is_primary = true WHERE user_id = ''user_id'' AND institution_id = new_institution_id;';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

