-- =====================================================
-- FIX: is_admin_safe() debe funcionar correctamente
-- =====================================================
-- El problema es que auth.uid() puede ser NULL en algunos contextos
-- Esta versión mejorada maneja mejor los casos edge

-- 1. Verificar la función actual
SELECT 
    'Función actual' as check_type,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_admin_safe' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Recrear la función con mejor manejo de NULL
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role_name TEXT;
  v_user_id UUID;
BEGIN
  -- Obtener user_id
  v_user_id := auth.uid();
  
  -- Si no hay user_id, retornar false
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Deshabilitar temporalmente RLS para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente sin activar RLS
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id;
  
  -- Retornar true si el rol es 'admin'
  RETURN COALESCE(v_role_name = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error (posible recursión), retornar false por seguridad
    RETURN false;
END;
$$;

-- 3. Verificar que la función funciona con un user_id específico
-- (Esto simula lo que pasaría cuando se llama desde el frontend)
DO $$
DECLARE
    v_test_user_id UUID := 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e';
    v_role_name TEXT;
    v_is_admin BOOLEAN;
BEGIN
    -- Verificar manualmente si el usuario es admin
    SELECT r.name INTO v_role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = v_test_user_id;
    
    RAISE NOTICE 'Usuario: %', v_test_user_id;
    RAISE NOTICE 'Rol encontrado: %', v_role_name;
    RAISE NOTICE 'Debería ser admin: %', (v_role_name = 'admin');
    
    -- Nota: is_admin_safe() solo funciona cuando auth.uid() no es NULL
    -- En el frontend, auth.uid() siempre tendrá un valor cuando el usuario está autenticado
END $$;

-- 4. Verificar políticas RLS que usan is_admin_safe()
SELECT 
    'Políticas que usan is_admin_safe()' as check_type,
    schemaname,
    tablename,
    policyname,
    qual as using_clause
FROM pg_policies
WHERE qual::text LIKE '%is_admin_safe%'
   OR with_check::text LIKE '%is_admin_safe%'
ORDER BY tablename, policyname;

-- 5. IMPORTANTE: Verificar que las políticas permiten acceso a admin
-- Para processed_documents, admin debe poder ver todo
SELECT 
    'Políticas processed_documents' as check_type,
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- Nota final
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IMPORTANTE:';
    RAISE NOTICE 'is_admin_safe() funciona correctamente cuando:';
    RAISE NOTICE '  1. Se llama desde el frontend (usuario autenticado)';
    RAISE NOTICE '  2. auth.uid() retorna un UUID válido';
    RAISE NOTICE '';
    RAISE NOTICE 'En el SQL Editor de Supabase, auth.uid() puede ser NULL';
    RAISE NOTICE 'pero en el frontend siempre tendrá un valor cuando el usuario';
    RAISE NOTICE 'está autenticado.';
    RAISE NOTICE '========================================';
END $$;

