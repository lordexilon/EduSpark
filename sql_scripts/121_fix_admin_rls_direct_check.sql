-- =====================================================
-- FIX ALTERNATIVO: Política RLS directa para admin
-- =====================================================
-- En lugar de depender de is_admin_safe(), verificamos directamente
-- en la política RLS si el usuario es admin

-- 1. Verificar función actual
SELECT 
    'Función actual' as check_type,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_admin_safe' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Crear función alternativa más simple que no use SECURITY DEFINER
-- Esta función se ejecuta con los permisos del usuario actual
CREATE OR REPLACE FUNCTION public.is_admin_direct()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER  -- Cambiar a INVOKER en lugar de DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() 
      AND r.name = 'admin'
      AND u.is_active = true
  );
$$;

-- 3. Actualizar políticas para usar ambas funciones (redundancia)
-- Primero, mantener las políticas existentes pero agregar una verificación directa
DROP POLICY IF EXISTS "admin_full_access_docs" ON processed_documents;
CREATE POLICY "admin_full_access_docs"
ON processed_documents
FOR ALL
TO authenticated
USING (
  -- Verificación directa en la política (más confiable)
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() 
      AND r.name = 'admin'
      AND u.is_active = true
  )
  OR 
  -- Fallback a función (por si acaso)
  public.is_admin_safe() 
  OR 
  -- Admin-campus y coordinator
  (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
  OR 
  (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
)
WITH CHECK (
  -- Misma lógica para WITH CHECK
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() 
      AND r.name = 'admin'
      AND u.is_active = true
  )
  OR 
  public.is_admin_safe() 
  OR 
  (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
  OR 
  (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
);

-- 4. Actualizar política de lectura también
DROP POLICY IF EXISTS "view_institution_docs" ON processed_documents;
CREATE POLICY "view_institution_docs"
ON processed_documents
FOR SELECT
TO authenticated
USING (
  -- Verificación directa para admin
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = auth.uid() 
      AND r.name = 'admin'
      AND u.is_active = true
  )
  OR 
  -- Fallback a función
  public.is_admin_safe()
  OR 
  -- Otros roles ven documentos de su institución
  (institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
);

-- 5. Verificar políticas finales
SELECT 
    'Políticas actualizadas' as check_type,
    policyname,
    cmd,
    CASE 
        WHEN qual::text LIKE '%EXISTS%' AND qual::text LIKE '%admin%' THEN '✅ Usa verificación directa'
        WHEN qual::text LIKE '%is_admin_safe%' THEN '✅ Usa función'
        ELSE '⚠️ Revisar'
    END as check_method
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- 6. Test: Verificar acceso con verificación directa
SELECT 
    'Test acceso directo' as test_type,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 
        FROM public.users u 
        JOIN public.roles r ON u.role_id = r.id 
        WHERE u.id = auth.uid() 
          AND r.name = 'admin'
          AND u.is_active = true
    )) as docs_via_direct_check,
    COUNT(*) FILTER (WHERE public.is_admin_safe()) as docs_via_function,
    COUNT(*) as total_docs
FROM processed_documents;

-- Nota final
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX APLICADO:';
    RAISE NOTICE 'Las políticas RLS ahora verifican directamente';
    RAISE NOTICE 'si el usuario es admin, sin depender solo de';
    RAISE NOTICE 'la función is_admin_safe().';
    RAISE NOTICE '';
    RAISE NOTICE 'Esto debería funcionar mejor en contexto RLS.';
    RAISE NOTICE 'Prueba desde el navegador ahora.';
    RAISE NOTICE '========================================';
END $$;

