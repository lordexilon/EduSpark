-- ============================================
-- FASE 1: DATOS DE PRUEBA
-- ============================================
-- Script para crear datos de prueba que permitan validar:
-- 1. Crear carrera de prueba
-- 2. Crear materia de prueba
-- 3. Matricular estudiante en carrera
-- 4. Inscribir estudiante en curso
-- 5. Asignar docente a materia
-- ============================================

-- NOTA: Este script asume que ya existen usuarios en la tabla users
-- Ajusta los IDs de usuario según tu base de datos

DO $$
DECLARE
  coordinator_user_id UUID;
  teacher_user_id UUID;
  student_user_id UUID;
  test_career_id INTEGER;
  test_subject_id INTEGER;
  test_course_id INTEGER;
BEGIN
  -- Obtener o crear usuario coordinador de prueba
  SELECT id INTO coordinator_user_id 
  FROM users 
  WHERE role_id = (SELECT id FROM roles WHERE name = 'coordinator') 
  LIMIT 1;
  
  IF coordinator_user_id IS NULL THEN
    -- Si no existe coordinador, usar un admin
    SELECT id INTO coordinator_user_id 
    FROM users 
    WHERE role_id = (SELECT id FROM roles WHERE name = 'admin') 
    LIMIT 1;
  END IF;

  -- Obtener o crear usuario docente de prueba
  SELECT id INTO teacher_user_id 
  FROM users 
  WHERE role_id = (SELECT id FROM roles WHERE name = 'teacher') 
  LIMIT 1;
  
  IF teacher_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No se encontró usuario docente. Asegúrate de tener al menos un docente.';
  END IF;

  -- Obtener o crear usuario estudiante de prueba
  SELECT id INTO student_user_id 
  FROM users 
  WHERE role_id = (SELECT id FROM roles WHERE name = 'student') 
  LIMIT 1;
  
  IF student_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No se encontró usuario estudiante. Asegúrate de tener al menos un estudiante.';
  END IF;

  -- 1. CREAR CARRERA DE PRUEBA
  INSERT INTO careers (
    name, code, description, coordinator_id, 
    duration_months, total_credits, degree_type, is_active
  ) VALUES (
    'Ingeniería en Sistemas',
    'ING-SIST-2025',
    'Carrera de prueba para validar funcionalidad de gestión académica',
    coordinator_user_id,
    48,
    180,
    'bachelor',
    true
  )
  ON CONFLICT (code) DO NOTHING
  RETURNING id INTO test_career_id;

  IF test_career_id IS NULL THEN
    SELECT id INTO test_career_id FROM careers WHERE code = 'ING-SIST-2025';
  END IF;

  RAISE NOTICE '✓ Carrera de prueba creada/obtenida: ID %', test_career_id;

  -- 2. CREAR MATERIA DE PRUEBA
  INSERT INTO subjects (
    career_id, name, code, description,
    credits, hours_per_week, semester, is_core, difficulty_level
  ) VALUES (
    test_career_id,
    'Programación I',
    'PROG-101',
    'Materia de prueba - Introducción a la programación',
    6,
    6,
    1,
    true,
    'beginner'
  )
  ON CONFLICT (career_id, code) DO NOTHING
  RETURNING id INTO test_subject_id;

  IF test_subject_id IS NULL THEN
    SELECT id INTO test_subject_id 
    FROM subjects 
    WHERE career_id = test_career_id AND code = 'PROG-101';
  END IF;

  RAISE NOTICE '✓ Materia de prueba creada/obtenida: ID %', test_subject_id;

  -- 3. MATRICULAR ESTUDIANTE EN CARRERA (si existe estudiante)
  IF student_user_id IS NOT NULL THEN
    INSERT INTO career_enrollments (
      student_id, career_id, enrollment_date, status,
      current_semester, total_credits_earned, academic_status
    ) VALUES (
      student_user_id,
      test_career_id,
      CURRENT_DATE,
      'active',
      1,
      0,
      'normal'
    )
    ON CONFLICT (student_id, career_id) DO NOTHING;

    RAISE NOTICE '✓ Estudiante matriculado en carrera';
  END IF;

  -- 4. OBTENER O CREAR CURSO DE PRUEBA Y ASOCIARLO A MATERIA
  IF teacher_user_id IS NOT NULL THEN
    -- Intentar obtener un curso existente
    SELECT id INTO test_course_id 
    FROM courses 
    WHERE teacher_id = teacher_user_id 
    LIMIT 1;

    -- Si no existe curso, crear uno
    IF test_course_id IS NULL THEN
      INSERT INTO courses (
        title, code, description, teacher_id, status, subject_id
      ) VALUES (
        'Curso de Prueba - Programación I',
        'CURSO-PROG-101',
        'Curso de prueba asociado a materia de prueba',
        teacher_user_id,
        'active',
        test_subject_id
      )
      RETURNING id INTO test_course_id;

      RAISE NOTICE '✓ Curso de prueba creado: ID %', test_course_id;
    ELSE
      -- Actualizar curso existente para asociarlo a la materia
      UPDATE courses 
      SET subject_id = test_subject_id 
      WHERE id = test_course_id;

      RAISE NOTICE '✓ Curso existente asociado a materia: ID %', test_course_id;
    END IF;

    -- 4. INSCRIBIR ESTUDIANTE EN CURSO (si existe estudiante y curso)
    IF student_user_id IS NOT NULL AND test_course_id IS NOT NULL THEN
      INSERT INTO course_enrollments (
        student_id, course_id, enrollment_date, status,
        attendance_percentage, participation_score, completion_percentage
      ) VALUES (
        student_user_id,
        test_course_id,
        CURRENT_DATE,
        'active',
        0,
        0,
        0
      )
      ON CONFLICT (student_id, course_id) DO NOTHING;

      RAISE NOTICE '✓ Estudiante inscrito en curso';
    END IF;

    -- 5. ASIGNAR DOCENTE A MATERIA
    INSERT INTO subject_assignments (
      subject_id, teacher_id, academic_period,
      start_date, end_date, status
    ) VALUES (
      test_subject_id,
      teacher_user_id,
      '2025-1',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '6 months',
      'active'
    )
    ON CONFLICT (subject_id, teacher_id, academic_period) DO NOTHING;

    RAISE NOTICE '✓ Docente asignado a materia';
  END IF;

  RAISE NOTICE '=== Datos de prueba creados exitosamente ===';
  RAISE NOTICE 'Para probar:';
  RAISE NOTICE '1. Carrera: ID % (ING-SIST-2025)', test_career_id;
  RAISE NOTICE '2. Materia: ID % (PROG-101)', test_subject_id;
  IF test_course_id IS NOT NULL THEN
    RAISE NOTICE '3. Curso: ID %', test_course_id;
  END IF;

END $$;

-- Verificar datos creados
SELECT 
  'Carreras' as tipo,
  COUNT(*) as cantidad
FROM careers
WHERE code = 'ING-SIST-2025'
UNION ALL
SELECT 
  'Materias',
  COUNT(*)
FROM subjects
WHERE code = 'PROG-101'
UNION ALL
SELECT 
  'Matriculaciones',
  COUNT(*)
FROM career_enrollments
UNION ALL
SELECT 
  'Asignaciones Docente-Materia',
  COUNT(*)
FROM subject_assignments;

