-- =====================================================
-- FIX FINAL: Asegurar que admin puede ver documentos
-- =====================================================
-- Este script verifica y corrige todo lo necesario

-- 1. Verificar que el usuario existe y tiene rol admin
SELECT 
    '1. Verificación usuario' as step,
    u.id,
    u.email,
    r.name as role_name,
    u.is_active
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE u.id = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e';

-- 2. Verificar documentos en la BD
SELECT 
    '2. Documentos en BD' as step,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE institution_id = 1) as institution_1
FROM processed_documents;

-- 3. Verificar función is_admin_safe() - versión mejorada
-- Esta versión es más robusta y maneja mejor los casos edge
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
  -- Obtener user_id del contexto de autenticación
  v_user_id := auth.uid();
  
  -- Si no hay user_id, retornar false (no autenticado)
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Deshabilitar RLS temporalmente para evitar recursión
  SET LOCAL row_security = off;
  
  -- Consultar directamente el rol del usuario
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id
    AND u.is_active = true;
  
  -- Retornar true si el rol es exactamente 'admin'
  RETURN COALESCE(v_role_name = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar false por seguridad
    RETURN false;
END;
$$;

-- 4. Verificar que las políticas RLS están correctas
-- Asegurar que admin puede ver TODO sin necesidad de institution_id
DROP POLICY IF EXISTS "admin_full_access_docs" ON processed_documents;
CREATE POLICY "admin_full_access_docs"
ON processed_documents
FOR ALL
TO authenticated
USING (
  -- Admin puede ver y gestionar TODO sin necesidad de institution_id
  public.is_admin_safe() 
  OR 
  -- Admin-campus y coordinator necesitan institution_id
  (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
  OR 
  (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
)
WITH CHECK (
  -- Admin puede crear/actualizar TODO sin necesidad de institution_id
  public.is_admin_safe() 
  OR 
  -- Admin-campus y coordinator solo pueden gestionar documentos de su institución
  (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
  OR 
  (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
);

-- 5. Política de lectura redundante (para asegurar acceso)
DROP POLICY IF EXISTS "view_institution_docs" ON processed_documents;
CREATE POLICY "view_institution_docs"
ON processed_documents
FOR SELECT
TO authenticated
USING (
  -- Admin ve TODO sin necesidad de institution_id
  public.is_admin_safe()
  OR 
  -- Otros roles ven documentos de su institución
  (institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
);

-- 6. Verificar políticas finales
SELECT 
    '3. Políticas finales' as step,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%is_admin_safe%' THEN '✅ Usa is_admin_safe()'
        ELSE '❌ No usa is_admin_safe()'
    END as uses_admin_check
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- 7. Test manual: Simular lo que hace el frontend
-- NOTA: Esto solo funcionará si estás autenticado en Supabase
DO $$
DECLARE
    v_test_user_id UUID := 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e';
    v_role_name TEXT;
    v_docs_count INTEGER;
BEGIN
    -- Verificar rol
    SELECT r.name INTO v_role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = v_test_user_id;
    
    -- Contar documentos totales
    SELECT COUNT(*) INTO v_docs_count
    FROM processed_documents;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN:';
    RAISE NOTICE '  Usuario: %', v_test_user_id;
    RAISE NOTICE '  Rol: %', v_role_name;
    RAISE NOTICE '  Total documentos en BD: %', v_docs_count;
    RAISE NOTICE '';
    RAISE NOTICE 'En el FRONTEND:';
    RAISE NOTICE '  - auth.uid() tendrá valor cuando el usuario está autenticado';
    RAISE NOTICE '  - is_admin_safe() debería retornar TRUE';
    RAISE NOTICE '  - Las políticas RLS deberían permitir acceso a todos los documentos';
    RAISE NOTICE '========================================';
END $$;

-- 8. Instrucciones finales
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Recarga la página /admin/documents en el navegador';
    RAISE NOTICE '2. Abre la consola del navegador (F12)';
    RAISE NOTICE '3. Busca los logs que empiezan con "📄 DocumentLibrary:"';
    RAISE NOTICE '4. Si ves "Documents loaded: 0", comparte los logs';
    RAISE NOTICE '';
    RAISE NOTICE 'Si aún no funciona, ejecuta este query en Supabase SQL Editor';
    RAISE NOTICE 'DESPUÉS de hacer login en Supabase Dashboard:';
    RAISE NOTICE '  SELECT COUNT(*) FROM processed_documents;';
    RAISE NOTICE '  SELECT public.is_admin_safe();';
    RAISE NOTICE '========================================';
END $$;

