-- 48_fix_and_test_trigger.sql
-- Corrige y prueba el trigger de registro de usuarios
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- =====================================================

-- Verificar si el trigger existe
SELECT 
  'Trigger' as component,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  CASE WHEN trigger_name IS NOT NULL THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';

-- Verificar si la función existe y su definición
SELECT 
  'Función' as component,
  routine_name,
  security_type,
  CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- =====================================================
-- PASO 2: RECREAR LA FUNCIÓN DEL TRIGGER
-- =====================================================

-- Eliminar función existente si existe
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Crear la función con manejo de errores mejorado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ⚠️ SEGURIDAD: Todos los usuarios nuevos SIEMPRE se crean como estudiantes (role_id: 1)
  -- El rol solo puede ser cambiado DESPUÉS del registro por un administrador
  -- Esto previene que alguien se registre como admin durante el proceso de registro
  -- Mapeo correcto: 1=student, 2=teacher, 3=admin, 4=coordinator
  INSERT INTO public.users (id, email, first_name, last_name, role_id)
  VALUES (
    new.id,
    COALESCE(new.email, ''),
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    1 -- ⚠️ SIEMPRE estudiante (ID: 1) - ignorar cualquier role_id en metadata
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    -- ⚠️ NO actualizar role_id en conflicto - mantener el rol existente
    -- Solo un admin puede cambiar roles después del registro
    updated_at = NOW();
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Registrar el error pero no fallar el trigger
    RAISE WARNING 'Error en handle_new_user para usuario %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- =====================================================
-- PASO 3: ELIMINAR Y RECREAR EL TRIGGER
-- =====================================================

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PASO 4: SINCRONIZAR USUARIOS EXISTENTES
-- =====================================================

-- Insertar usuarios de auth.users que no están en public.users
INSERT INTO public.users (id, email, first_name, last_name, role_id)
SELECT 
  au.id,
  COALESCE(au.email, ''),
  COALESCE(au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  1 -- Siempre estudiante (ID: 1) - Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PASO 5: VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que el trigger se creó
SELECT 
  'Trigger Creado' as verification,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';

-- Verificar usuarios sincronizados
SELECT 
  'Usuarios Sincronizados' as verification,
  COUNT(*) as usuarios_en_auth,
  (SELECT COUNT(*) FROM public.users) as usuarios_en_public,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as usuarios_faltantes
FROM auth.users;

-- =====================================================
-- RESUMEN
-- =====================================================

DO $$
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
  users_synced INTEGER;
BEGIN
  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_table = 'users'
      AND event_object_schema = 'auth'
  ) INTO trigger_exists;
  
  -- Verificar función
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'handle_new_user'
  ) INTO function_exists;
  
  -- Contar usuarios sincronizados
  SELECT COUNT(*) INTO users_synced
  FROM auth.users au
  INNER JOIN public.users pu ON au.id = pu.id;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESULTADO DE LA CORRECCIÓN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger on_auth_user_created: %', 
    CASE WHEN trigger_exists THEN '✅ ACTIVO' ELSE '❌ ERROR' END;
  RAISE NOTICE 'Función handle_new_user: %', 
    CASE WHEN function_exists THEN '✅ EXISTE' ELSE '❌ ERROR' END;
  RAISE NOTICE 'Usuarios sincronizados: %', users_synced;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  IF trigger_exists AND function_exists THEN
    RAISE NOTICE '✅ El trigger está configurado correctamente.';
    RAISE NOTICE '   Los nuevos registros deberían funcionar automáticamente.';
  ELSE
    RAISE NOTICE '❌ Hay un problema con la configuración.';
    RAISE NOTICE '   Revisa los errores anteriores.';
  END IF;
  RAISE NOTICE '';
END $$;

