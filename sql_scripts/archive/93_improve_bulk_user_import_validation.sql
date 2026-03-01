-- sql_scripts/93_improve_bulk_user_import_validation.sql
-- Mejora la función de importación masiva para:
-- 1. Usar identity_document como identificador único (además de email)
-- 2. Validar relaciones carrera-materia-curso
-- 3. Mejorar validaciones de datos

-- =====================================================
-- 1. MEJORAR FUNCIÓN create_user_with_assignments
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
  p_role_name TEXT DEFAULT 'student',
  p_identity_document TEXT DEFAULT NULL,
  p_identity_document_type TEXT DEFAULT NULL,
  p_career_id INTEGER DEFAULT NULL,
  p_subject_id INTEGER DEFAULT NULL,
  p_course_id INTEGER DEFAULT NULL,
  p_position TEXT DEFAULT NULL,
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
  v_existing_user_id UUID;
  v_course_subject_id INTEGER;
  v_course_career_id INTEGER;
  v_subject_career_id INTEGER;
BEGIN
  -- Validar email
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email es requerido',
      'email', p_email
    );
  END IF;

  -- Validar institución
  IF p_institution_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'institution_id es requerido',
      'email', p_email
    );
  END IF;

  -- Validar documento de identidad si se proporciona
  IF p_identity_document IS NOT NULL AND p_identity_document != '' THEN
    -- Validar formato básico
    IF length(trim(p_identity_document)) < 4 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Documento de identidad debe tener al menos 4 caracteres',
        'email', p_email,
        'identity_document', p_identity_document
      );
    END IF;

    -- Verificar si ya existe un usuario con este documento de identidad
    SELECT id INTO v_existing_user_id
    FROM public.users
    WHERE identity_document = trim(p_identity_document)
    LIMIT 1;

    IF v_existing_user_id IS NOT NULL THEN
      -- Usuario existente por documento de identidad
      v_user_id := v_existing_user_id;
      
      -- Obtener role_id
      SELECT id INTO v_role_id
      FROM public.roles
      WHERE name = p_role_name
      LIMIT 1;

      IF v_role_id IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Rol "%s" no encontrado', p_role_name),
          'email', p_email
        );
      END IF;
      
      -- Actualizar datos del usuario
      UPDATE public.users
      SET 
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        email = COALESCE(p_email, email),
        role_id = v_role_id,
        email_verified = true,
        is_active = true,
        identity_document_type = COALESCE(p_identity_document_type, identity_document_type)
      WHERE id = v_user_id;

      -- Continuar con asignaciones (saltar creación de usuario nuevo)
      -- Saltar al bloque de asignaciones
    ELSE
      -- No existe usuario por documento, continuar con verificación por email
      
      -- Obtener role_id
      SELECT id INTO v_role_id
      FROM public.roles
      WHERE name = p_role_name
      LIMIT 1;

      IF v_role_id IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('Rol "%s" no encontrado', p_role_name),
          'email', p_email
        );
      END IF;

      -- Verificar si el usuario ya existe por email
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
        
        -- Actualizar usuario en public.users si existe
        UPDATE public.users
        SET 
          first_name = COALESCE(p_first_name, first_name),
          last_name = COALESCE(p_last_name, last_name),
          role_id = v_role_id,
          email_verified = true,
          is_active = true,
          identity_document = COALESCE(trim(p_identity_document), identity_document),
          identity_document_type = COALESCE(p_identity_document_type, identity_document_type)
        WHERE id = v_user_id;

        -- Si no existe en public.users, crearlo
        IF NOT FOUND THEN
          INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified, is_active, identity_document, identity_document_type)
          VALUES (v_user_id, p_email, p_first_name, p_last_name, v_role_id, true, true, trim(p_identity_document), p_identity_document_type);
        END IF;
      ELSE
        -- Generar UUID para el nuevo usuario
        v_user_id := gen_random_uuid();

        -- Crear usuario en public.users
        INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified, is_active, identity_document, identity_document_type)
        VALUES (v_user_id, p_email, p_first_name, p_last_name, v_role_id, true, true, trim(p_identity_document), p_identity_document_type);
      END IF;
    END IF;
  ELSE
    -- No se proporcionó identity_document, verificar solo por email
    
    -- Obtener role_id
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE name = p_role_name
    LIMIT 1;

    IF v_role_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Rol "%s" no encontrado', p_role_name),
        'email', p_email
      );
    END IF;

    -- Verificar si el usuario ya existe por email
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
      SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
      
      -- Actualizar usuario en public.users si existe
      UPDATE public.users
      SET 
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        role_id = v_role_id,
        email_verified = true,
        is_active = true,
        identity_document = COALESCE(trim(p_identity_document), identity_document),
        identity_document_type = COALESCE(p_identity_document_type, identity_document_type)
      WHERE id = v_user_id;

      -- Si no existe en public.users, crearlo
      IF NOT FOUND THEN
        INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified, is_active, identity_document, identity_document_type)
        VALUES (v_user_id, p_email, p_first_name, p_last_name, v_role_id, true, true, trim(p_identity_document), p_identity_document_type);
      END IF;
    ELSE
      -- Generar UUID para el nuevo usuario
      v_user_id := gen_random_uuid();

      -- Crear usuario en public.users
      INSERT INTO public.users (id, email, first_name, last_name, role_id, email_verified, is_active, identity_document, identity_document_type)
      VALUES (v_user_id, p_email, p_first_name, p_last_name, v_role_id, true, true, trim(p_identity_document), p_identity_document_type);
    END IF;
  END IF;

  -- Asignar a institución
  INSERT INTO public.user_institutions (user_id, institution_id, is_primary, position)
  VALUES (v_user_id, p_institution_id, true, p_position)
  ON CONFLICT (user_id, institution_id) DO UPDATE
  SET is_primary = true, position = COALESCE(p_position, user_institutions.position);

  -- VALIDAR Y ASIGNAR RELACIONES CARRERA-MATERIA-CURSO
  
  -- Si se proporciona curso, validar que pertenezca a la materia (si se especifica)
  IF p_course_id IS NOT NULL AND p_subject_id IS NOT NULL THEN
    SELECT subject_id INTO v_course_subject_id
    FROM public.courses
    WHERE id = p_course_id;
    
    IF v_course_subject_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Curso con ID %s no encontrado', p_course_id),
        'email', p_email
      );
    END IF;
    
    IF v_course_subject_id != p_subject_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('El curso %s no pertenece a la materia %s. El curso pertenece a la materia %s', 
          p_course_id, p_subject_id, v_course_subject_id),
        'email', p_email
      );
    END IF;
  END IF;

  -- Si se proporciona materia, validar que pertenezca a la carrera (si se especifica)
  IF p_subject_id IS NOT NULL AND p_career_id IS NOT NULL THEN
    SELECT career_id INTO v_subject_career_id
    FROM public.subjects
    WHERE id = p_subject_id;
    
    IF v_subject_career_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Materia con ID %s no encontrada', p_subject_id),
        'email', p_email
      );
    END IF;
    
    IF v_subject_career_id != p_career_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('La materia %s no pertenece a la carrera %s. La materia pertenece a la carrera %s', 
          p_subject_id, p_career_id, v_subject_career_id),
        'email', p_email
      );
    END IF;
  END IF;

  -- Si se proporciona curso sin materia, obtener la materia del curso y validar contra carrera
  IF p_course_id IS NOT NULL AND p_subject_id IS NULL AND p_career_id IS NOT NULL THEN
    SELECT subject_id INTO v_course_subject_id
    FROM public.courses
    WHERE id = p_course_id;
    
    IF v_course_subject_id IS NOT NULL THEN
      SELECT career_id INTO v_subject_career_id
      FROM public.subjects
      WHERE id = v_course_subject_id;
      
      IF v_subject_career_id IS NOT NULL AND v_subject_career_id != p_career_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', format('El curso %s pertenece a una materia de la carrera %s, no a la carrera %s especificada', 
            p_course_id, v_subject_career_id, p_career_id),
          'email', p_email
        );
      END IF;
    END IF;
  END IF;

  -- Asignar a carrera si se proporciona
  IF p_career_id IS NOT NULL THEN
    -- Verificar que la carrera existe
    IF NOT EXISTS (SELECT 1 FROM public.careers WHERE id = p_career_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Carrera con ID %s no encontrada', p_career_id),
        'email', p_email
      );
    END IF;

    INSERT INTO public.career_enrollments (student_id, career_id, status)
    VALUES (v_user_id, p_career_id, 'active')
    ON CONFLICT (student_id, career_id) DO UPDATE
    SET status = 'active', updated_at = NOW();
  END IF;

  -- Asignar a curso si se proporciona
  IF p_course_id IS NOT NULL THEN
    -- Verificar que el curso existe
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Curso con ID %s no encontrado', p_course_id),
        'email', p_email
      );
    END IF;

    INSERT INTO public.course_enrollments (student_id, course_id, status)
    VALUES (v_user_id, p_course_id, 'active')
    ON CONFLICT (student_id, course_id) DO UPDATE
    SET status = 'active', updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'Usuario creado/actualizado y asignado correctamente',
    'email', p_email,
    'identity_document', p_identity_document
  );

EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM LIKE '%identity_document%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Ya existe un usuario con el documento de identidad %s', p_identity_document),
        'email', p_email,
        'identity_document', p_identity_document
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Violación de restricción única: ' || SQLERRM,
        'email', p_email
      );
    END IF;
  WHEN OTHERS THEN
    v_error := SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error,
      'email', p_email,
      'identity_document', p_identity_document
    );
END;
$$;

-- =====================================================
-- 2. ACTUALIZAR FUNCIÓN create_bulk_users
-- =====================================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS public.create_bulk_users(JSONB) CASCADE;

CREATE OR REPLACE FUNCTION public.create_bulk_users(
  p_users JSONB
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
  IF jsonb_typeof(p_users) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'p_users debe ser un array JSON'
    );
  END IF;

  v_total := jsonb_array_length(p_users);

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
      p_identity_document_type := v_user->>'identity_document_type',
      p_career_id := CASE WHEN v_user->>'career_id' IS NOT NULL AND v_user->>'career_id' != '' THEN (v_user->>'career_id')::INTEGER ELSE NULL END,
      p_subject_id := CASE WHEN v_user->>'subject_id' IS NOT NULL AND v_user->>'subject_id' != '' THEN (v_user->>'subject_id')::INTEGER ELSE NULL END,
      p_course_id := CASE WHEN v_user->>'course_id' IS NOT NULL AND v_user->>'course_id' != '' THEN (v_user->>'course_id')::INTEGER ELSE NULL END,
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
-- 3. COMENTARIOS Y PERMISOS
-- =====================================================

COMMENT ON FUNCTION public.create_user_with_assignments IS 
'Crea o actualiza un usuario usando email o identity_document como identificador.
Valida relaciones carrera-materia-curso antes de asignar.
Si el usuario existe por identity_document, lo actualiza en lugar de crear uno nuevo.';

GRANT EXECUTE ON FUNCTION public.create_user_with_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_bulk_users TO authenticated;

