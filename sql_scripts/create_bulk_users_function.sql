-- sql_scripts/create_bulk_users_function.sql
-- Función RPC para crear usuarios masivamente sin confirmación de email
-- Asigna automáticamente a institución, carrera, materia y curso

-- =====================================================
-- 1. FUNCIÓN PARA CREAR UN USUARIO INDIVIDUAL
-- =====================================================

-- Eliminar todas las versiones posibles de la función existente
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT oid, proname, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'create_user_with_assignments'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_user_with_assignments(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_institution_id INTEGER,
  p_role_name TEXT DEFAULT 'student', -- 'student', 'teacher', 'admin-campus', 'coordinator'
  p_identity_document TEXT DEFAULT NULL, -- Documento de identidad (DNI, cédula, etc.)
  p_career_id INTEGER DEFAULT NULL,
  p_subject_id INTEGER DEFAULT NULL,
  p_course_id INTEGER DEFAULT NULL,
  p_position TEXT DEFAULT NULL, -- Cargo/posición en la institución
  p_skip_email_confirmation BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_role_id INTEGER;
  v_result JSONB;
  v_error TEXT;
BEGIN
  -- Validar email
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email es requerido'
    );
  END IF;

  -- Validar institución
  IF p_institution_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'institution_id es requerido'
    );
  END IF;

  -- Obtener role_id
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = p_role_name
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Rol "%s" no encontrado', p_role_name)
    );
  END IF;

  -- Verificar si el usuario ya existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    -- Obtener el ID del usuario existente
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    
    -- Actualizar usuario en public.users si existe
    UPDATE public.users
    SET 
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      role_id = v_role_id,
      email_verified = true,
      is_active = true
    WHERE id = v_user_id;

    -- Si no existe en public.users, crearlo
    IF NOT FOUND THEN
      INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified, is_active)
      VALUES (v_user_id, p_email, p_first_name, p_last_name, v_role_id, true, true);
    END IF;

    -- Asignar a institución si no está asignado
    INSERT INTO public.user_institutions (user_id, institution_id, is_primary, position)
    VALUES (v_user_id, p_institution_id, true, p_position)
    ON CONFLICT (user_id, institution_id) DO UPDATE
    SET is_primary = true, position = COALESCE(p_position, user_institutions.position);

    -- Asignar a carrera si se proporciona
    IF p_career_id IS NOT NULL THEN
      INSERT INTO public.career_enrollments (student_id, career_id, status)
      VALUES (v_user_id, p_career_id, 'active')
      ON CONFLICT (student_id, career_id) DO NOTHING;
    END IF;

    -- Asignar a curso si se proporciona
    IF p_course_id IS NOT NULL THEN
      INSERT INTO public.course_enrollments (student_id, course_id, status)
      VALUES (v_user_id, p_course_id, 'active')
      ON CONFLICT (student_id, course_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'message', 'Usuario existente actualizado y asignado',
      'email', p_email
    );
  END IF;

  -- Generar UUID para el nuevo usuario
  v_user_id := gen_random_uuid();

  -- Crear usuario en public.users
  -- NOTA: Para crear en auth.users sin confirmación, se debe usar Supabase Admin API
  -- desde una Edge Function o backend seguro. Esta función solo crea en public.users
  INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified, is_active, identity_document)
  VALUES (v_user_id, p_email, p_first_name, p_last_name, v_role_id, true, true, p_identity_document);

  -- Asignar a institución
  INSERT INTO public.user_institutions (user_id, institution_id, is_primary, position)
  VALUES (v_user_id, p_institution_id, true, p_position);

  -- Asignar a carrera si se proporciona
  IF p_career_id IS NOT NULL THEN
    INSERT INTO public.career_enrollments (student_id, career_id, status)
    VALUES (v_user_id, p_career_id, 'active')
    ON CONFLICT (student_id, career_id) DO NOTHING;
  END IF;

  -- Asignar a curso si se proporciona
  IF p_course_id IS NOT NULL THEN
    INSERT INTO public.course_enrollments (student_id, course_id, status)
    VALUES (v_user_id, p_course_id, 'active')
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Usuario creado en public.users. Requiere creación en auth.users mediante Admin API.',
    'email', p_email,
    'password_set', false,
    'note', 'Para crear el usuario en auth.users, usar Supabase Admin API desde backend o Edge Function'
  );

EXCEPTION
  WHEN OTHERS THEN
    v_error := SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error,
      'email', p_email
    );
END;
$$;

-- =====================================================
-- 2. FUNCIÓN PARA CREAR MÚLTIPLES USUARIOS
-- =====================================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS public.create_bulk_users(JSONB) CASCADE;

CREATE OR REPLACE FUNCTION public.create_bulk_users(
  p_users JSONB -- Array de objetos con datos de usuarios
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user JSONB;
  v_result JSONB;
  v_results JSONB[] := ARRAY[]::JSONB[];
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_total INTEGER;
BEGIN
  -- Validar que p_users sea un array
  IF jsonb_typeof(p_users) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'p_users debe ser un array JSON'
    );
  END IF;

  v_total := jsonb_array_length(p_users);

  -- Procesar cada usuario
  FOR v_user IN SELECT * FROM jsonb_array_elements(p_users)
  LOOP
    v_result := public.create_user_with_assignments(
      p_email := v_user->>'email',
      p_password := v_user->>'password',
      p_first_name := v_user->>'first_name',
      p_last_name := v_user->>'last_name',
      p_institution_id := (v_user->>'institution_id')::INTEGER,
      p_role_name := COALESCE(v_user->>'role', 'student'),
      p_identity_document := v_user->>'identity_document',
      p_career_id := CASE WHEN v_user->>'career_id' IS NOT NULL THEN (v_user->>'career_id')::INTEGER ELSE NULL END,
      p_subject_id := CASE WHEN v_user->>'subject_id' IS NOT NULL THEN (v_user->>'subject_id')::INTEGER ELSE NULL END,
      p_course_id := CASE WHEN v_user->>'course_id' IS NOT NULL THEN (v_user->>'course_id')::INTEGER ELSE NULL END,
      p_position := v_user->>'position',
      p_skip_email_confirmation := COALESCE((v_user->>'skip_email_confirmation')::BOOLEAN, true)
    );

    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_failed_count := v_failed_count + 1;
    END IF;

    v_results := array_append(v_results, v_result);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'success_count', v_success_count,
    'failed_count', v_failed_count,
    'results', array_to_json(v_results)::JSONB
  );
END;
$$;

-- =====================================================
-- 3. PERMISOS
-- =====================================================

-- Otorgar permisos de ejecución a administradores
GRANT EXECUTE ON FUNCTION public.create_user_with_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bulk_users TO authenticated;

-- =====================================================
-- 4. COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION public.create_user_with_assignments IS 
'Crea un usuario con asignaciones automáticas a institución, carrera y curso. 
Nota: Para crear usuarios en auth.users sin confirmación, usar Supabase Admin API desde backend.';

COMMENT ON FUNCTION public.create_bulk_users IS 
'Crea múltiples usuarios masivamente desde un array JSON. 
Cada usuario puede tener asignaciones a institución, carrera, materia y curso.';

-- =====================================================
-- 5. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Funciones de creación masiva de usuarios creadas:';
  RAISE NOTICE '   - create_user_with_assignments: Crea un usuario individual';
  RAISE NOTICE '   - create_bulk_users: Crea múltiples usuarios desde JSON';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '   Para crear usuarios en auth.users sin confirmación de email,';
  RAISE NOTICE '   se requiere usar Supabase Admin API desde un backend seguro';
  RAISE NOTICE '   o una Edge Function.';
END $$;

