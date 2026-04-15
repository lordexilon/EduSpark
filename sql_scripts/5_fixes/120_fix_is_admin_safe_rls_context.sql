-- =====================================================
-- FIX CRÍTICO: is_admin_safe() no funciona en contexto RLS
-- =====================================================
-- El problema es que auth.uid() puede no estar disponible correctamente
-- en el contexto de SECURITY DEFINER cuando se evalúa desde RLS

-- SOLUCIÓN: Crear una función que use el JWT directamente
-- en lugar de depender de auth.uid()

-- 1. Reemplazar la función actual (sin eliminarla para no romper las políticas)
-- 2. Crear nueva función que lee directamente del JWT
-- Esta función lee el user_id del JWT token directamente
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_role_name TEXT;
BEGIN
  -- Obtener user_id del JWT token directamente
  -- Esto funciona mejor que auth.uid() en algunos contextos
  v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
  
  -- Si no hay user_id, intentar con auth.uid() como fallback
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;
  
  -- Si aún no hay user_id, retornar false
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Deshabilitar RLS temporalmente para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente el rol del usuario
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id
    AND u.is_active = true;
  
  -- Retornar true si el rol es 'admin'
  RETURN COALESCE(v_role_name = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar false por seguridad
    RETURN false;
END;
$$;

-- 3. Verificar que la función funciona
SELECT 
    'Test is_admin_safe()' as test_type,
    public.is_admin_safe() as result,
    auth.uid() as auth_uid,
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid as jwt_user_id;

-- 4. Verificar políticas RLS
SELECT 
    'Políticas RLS' as check_type,
    policyname,
    cmd,
    qual as using_clause
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- 5. Test final: Verificar acceso a documentos
SELECT 
    'Test acceso documentos' as test_type,
    COUNT(*) FILTER (WHERE public.is_admin_safe()) as docs_via_admin,
    COUNT(*) as total_docs
FROM processed_documents;

-- Nota importante
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX APLICADO:';
    RAISE NOTICE 'is_admin_safe() ahora lee el user_id del JWT';
    RAISE NOTICE 'directamente, lo cual funciona mejor en contexto RLS.';
    RAISE NOTICE '';
    RAISE NOTICE 'Prueba desde el navegador ahora.';
    RAISE NOTICE '========================================';
END $$;

