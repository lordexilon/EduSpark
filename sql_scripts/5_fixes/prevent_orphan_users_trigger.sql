-- =====================================================
-- TRIGGER PARA PREVENIR USUARIOS HUÉRFANOS
-- =====================================================
-- Este trigger previene la creación de usuarios en public.users
-- que no existen en auth.users, evitando así usuarios huérfanos.
-- =====================================================

-- Función que valida la existencia en auth.users
CREATE OR REPLACE FUNCTION prevent_orphan_users_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_user_exists BOOLEAN;
BEGIN
  -- Solo validar en INSERT (no en UPDATE para no bloquear migraciones)
  IF TG_OP = 'INSERT' THEN
    -- Verificar si el usuario existe en auth.users
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE id = NEW.id
    ) INTO v_auth_user_exists;
    
    -- Si NO existe en auth.users, registrar advertencia pero PERMITIR la operación
    -- (modo WARNING en lugar de ERROR para no romper migraciones legítimas)
    IF NOT v_auth_user_exists THEN
      RAISE WARNING 
        E'⚠️ USUARIO HUÉRFANO DETECTADO ⚠️\n' ||
        'ID: %, Email: %\n' ||
        'Este usuario se está creando en public.users pero NO existe en auth.users.\n' ||
        'Esto significa que el usuario NO PODRÁ INICIAR SESIÓN.\n\n' ||
        '✅ ACCIÓN REQUERIDA:\n' ||
        '1. Si es una migración legítima, ejecuta después: Edge Function migrateUsersToAuth\n' ||
        '2. Si es creación nueva, usa SIEMPRE la Edge Function createBulkUsers\n\n' ||
        '📍 Ve a /admin/migrate-orphan-users para resolver usuarios huérfanos',
        NEW.id, NEW.email;
      
      -- Opcional: Descomentar la siguiente línea para BLOQUEAR completamente
      -- usuarios huérfanos (más estricto pero puede romper algunas migraciones)
      /*
      RAISE EXCEPTION 
        'No se puede crear usuario en public.users sin auth.users. ' ||
        'Usa la Edge Function createBulkUsers o migrateUsersToAuth.';
      */
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger ANTES de INSERT
DROP TRIGGER IF EXISTS check_auth_user_exists ON public.users;
CREATE TRIGGER check_auth_user_exists
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphan_users_trigger();

-- Comentario explicativo
COMMENT ON TRIGGER check_auth_user_exists ON public.users IS 
'Previene la creación de usuarios huérfanos (usuarios en public.users sin auth.users). Modo WARNING.';

COMMENT ON FUNCTION prevent_orphan_users_trigger() IS 
'Función de trigger que detecta y advierte sobre intentos de crear usuarios huérfanos';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de prevención de usuarios huérfanos creado exitosamente';
  RAISE NOTICE '📝 MODO: WARNING (permite la operación pero registra advertencia)';
  RAISE NOTICE '🔧 Para modo ESTRICTO (bloquear completamente): descomentar la línea 35 en la función';
  RAISE NOTICE '📊 Los avisos aparecerán en los logs de Supabase cuando se detecten usuarios huérfanos';
END $$;
