-- =====================================================
-- SCRIPT PARA MIGRAR USUARIOS A AUTH.USERS
-- Ejecutar en Supabase SQL Editor
-- =====================================================
-- Este script crea usuarios en auth.users para que puedan iniciar sesión
-- Usa el identity_document (cédula) como contraseña

-- =====================================================
-- PASO 1: Ver cuántos usuarios necesitan migración
-- =====================================================

SELECT 
  'DIAGNÓSTICO' as tipo,
  COUNT(*) FILTER (WHERE au.id IS NOT NULL) as usuarios_con_auth,
  COUNT(*) FILTER (WHERE au.id IS NULL) as usuarios_SIN_auth_NECESITAN_MIGRACION,
  COUNT(*) as total_usuarios
FROM public.users pu
LEFT JOIN auth.users au ON pu.email = au.email;

-- =====================================================
-- PASO 2: Ver detalle de usuarios que NO pueden iniciar sesión
-- =====================================================

SELECT 
  pu.email,
  pu.first_name,
  pu.last_name,
  pu.identity_document as cedula_sera_password,
  'NECESITA MIGRACIÓN' as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.email = au.email
WHERE au.id IS NULL
  AND pu.email IS NOT NULL
ORDER BY pu.created_at DESC
LIMIT 20;

-- =====================================================
-- PASO 3: CREAR FUNCIÓN DE MIGRACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_users_to_auth(
  p_default_password TEXT DEFAULT 'EduSpark2024!',
  p_use_identity_as_password BOOLEAN DEFAULT true
)
RETURNS TABLE (
  email TEXT,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user RECORD;
  v_password TEXT;
  v_new_user_id UUID;
  v_existing_auth_id UUID;
  v_migrated INT := 0;
  v_skipped INT := 0;
  v_failed INT := 0;
BEGIN
  -- Procesar cada usuario de public.users que no esté en auth.users
  FOR v_user IN 
    SELECT 
      pu.id,
      pu.email,
      pu.first_name,
      pu.last_name,
      pu.identity_document,
      pu.role_id
    FROM public.users pu
    LEFT JOIN auth.users au ON pu.email = au.email
    WHERE au.id IS NULL
      AND pu.email IS NOT NULL
      AND pu.email != ''
  LOOP
    BEGIN
      -- Determinar contraseña
      IF p_use_identity_as_password AND v_user.identity_document IS NOT NULL AND length(v_user.identity_document) >= 6 THEN
        v_password := v_user.identity_document;
      ELSE
        v_password := p_default_password;
      END IF;
      
      -- Asegurar que la contraseña tenga al menos 6 caracteres
      IF length(v_password) < 6 THEN
        v_password := v_password || '123456';
        v_password := substring(v_password from 1 for 12);
      END IF;

      -- Generar nuevo UUID para auth.users
      v_new_user_id := gen_random_uuid();
      
      -- Insertar en auth.users
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at,
        is_anonymous,
        aud,
        role
      )
      VALUES (
        v_new_user_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        v_user.email,
        crypt(v_password, gen_salt('bf')),
        NOW(),
        '',
        '',
        '',
        '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'first_name', COALESCE(v_user.first_name, ''),
          'last_name', COALESCE(v_user.last_name, '')
        ),
        false,
        NOW(),
        NOW(),
        NULL,
        NULL,
        '',
        '',
        '',
        0,
        NULL,
        '',
        NULL,
        false,
        NULL,
        false,
        'authenticated',
        'authenticated'
      );

      -- Insertar identidad en auth.identities
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        v_new_user_id,
        v_new_user_id,
        v_user.email,
        jsonb_build_object(
          'sub', v_new_user_id::text,
          'email', v_user.email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        NOW(),
        NOW(),
        NOW()
      );

      -- Actualizar public.users con el nuevo ID de auth
      UPDATE public.users
      SET id = v_new_user_id
      WHERE id = v_user.id;

      -- Actualizar user_institutions
      UPDATE public.user_institutions
      SET user_id = v_new_user_id
      WHERE user_id = v_user.id;

      -- Actualizar course_enrollments
      UPDATE public.course_enrollments
      SET student_id = v_new_user_id
      WHERE student_id = v_user.id;

      -- Actualizar career_enrollments
      UPDATE public.career_enrollments
      SET student_id = v_new_user_id
      WHERE student_id = v_user.id;

      v_migrated := v_migrated + 1;
      
      email := v_user.email;
      status := 'MIGRADO';
      message := 'Usuario creado en auth.users. Contraseña: ' || 
                 CASE WHEN p_use_identity_as_password AND v_user.identity_document IS NOT NULL 
                      THEN 'documento de identidad' 
                      ELSE 'contraseña por defecto' END;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      email := v_user.email;
      status := 'ERROR';
      message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  -- Retornar resumen final
  email := '--- RESUMEN ---';
  status := 'COMPLETADO';
  message := format('Migrados: %s, Fallidos: %s', v_migrated, v_failed);
  RETURN NEXT;
END;
$$;

-- =====================================================
-- PASO 4: EJECUTAR LA MIGRACIÓN
-- =====================================================
-- Descomenta la siguiente línea para ejecutar:

SELECT * FROM migrate_users_to_auth(
  'EduSpark2024!',  -- Contraseña por defecto si no hay documento
  true              -- true = usar documento de identidad como contraseña
);

-- =====================================================
-- PASO 5: VERIFICAR RESULTADOS
-- =====================================================

SELECT 
  'RESULTADO FINAL' as tipo,
  COUNT(*) FILTER (WHERE au.id IS NOT NULL) as usuarios_con_auth,
  COUNT(*) FILTER (WHERE au.id IS NULL) as usuarios_sin_auth,
  COUNT(*) as total_usuarios
FROM public.users pu
LEFT JOIN auth.users au ON pu.email = au.email;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 
-- 1. La contraseña por defecto es: EduSpark2024!
-- 2. Si el usuario tiene identity_document (cédula), se usa como contraseña
-- 3. Los usuarios migrados pueden iniciar sesión inmediatamente
-- 4. El email ya está confirmado automáticamente
--
-- PARA LIMPIAR (si necesitas volver a ejecutar):
-- DROP FUNCTION IF EXISTS migrate_users_to_auth(TEXT, BOOLEAN);
