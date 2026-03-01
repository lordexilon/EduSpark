-- =====================================================
-- DEPRECAR FUNCIÓN RPC create_bulk_users
-- =====================================================
-- Esta función está siendo deprecada porque solo crea usuarios
-- en public.users, NO en auth.users, lo que genera usuarios
-- huérfanos que no pueden iniciar sesión.
--
-- SOLUCIÓN CORRECTA: Usar la Edge Function 'createBulkUsers'
-- que crea usuarios en AMBAS tablas.
-- =====================================================

-- Renombrar la función antigua (si existe)
DO $$
BEGIN
    ALTER FUNCTION public.create_bulk_users(JSONB) 
    RENAME TO create_bulk_users_DEPRECATED_DO_NOT_USE;
    RAISE NOTICE '✅ Función renombrada a create_bulk_users_DEPRECATED_DO_NOT_USE';
EXCEPTION
    WHEN undefined_function THEN
        RAISE NOTICE '⚠️ La función create_bulk_users no existe, creando nueva versión deprecada...';
END $$;

-- Crear nueva función que falla explícitamente
CREATE OR REPLACE FUNCTION public.create_bulk_users(p_users JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'FUNCION DEPRECADA - NO USAR. Esta función RPC está DEPRECADA porque solo crea usuarios en public.users, NO en auth.users, lo que genera usuarios huérfanos que no pueden iniciar sesión. SOLUCION: Usa la Edge Function createBulkUsers que crea usuarios en AMBAS tablas. Para desplegar: supabase functions deploy createBulkUsers'
    USING HINT = 'Contacta al administrador del sistema si necesitas ayuda',
          ERRCODE = 'feature_not_supported';
END;
$$;

-- Agregar comentario explicativo
COMMENT ON FUNCTION public.create_bulk_users(JSONB) IS 
'DEPRECADA - Esta función solo crea en public.users. Usa la Edge Function createBulkUsers.';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Función create_bulk_users deprecada exitosamente';
  RAISE NOTICE '📝 La función antigua ha sido renombrada a: create_bulk_users_DEPRECATED_DO_NOT_USE';
  RAISE NOTICE '⚠️ Cualquier intento de usar create_bulk_users ahora fallará con un mensaje explicativo';
END $$;
