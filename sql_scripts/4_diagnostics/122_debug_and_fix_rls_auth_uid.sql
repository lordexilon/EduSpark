-- =====================================================
-- DEBUG Y FIX: Verificar por qué auth.uid() no funciona
-- =====================================================

-- 1. Verificar si RLS está habilitado
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'processed_documents';

-- 2. Verificar todas las políticas activas
SELECT 
    'Políticas activas' as check_type,
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- 3. Verificar usuario específico manualmente
DO $$
DECLARE
    v_user_id UUID := 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e';
    v_is_admin BOOLEAN;
    v_role_name TEXT;
BEGIN
    SELECT r.name INTO v_role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = v_user_id
      AND u.is_active = true;
    
    v_is_admin := (v_role_name = 'admin');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN MANUAL:';
    RAISE NOTICE '  User ID: %', v_user_id;
    RAISE NOTICE '  Rol: %', v_role_name;
    RAISE NOTICE '  Es admin: %', v_is_admin;
    RAISE NOTICE '';
    RAISE NOTICE 'Si el rol es "admin", el problema es que';
    RAISE NOTICE 'auth.uid() no está disponible en este contexto.';
    RAISE NOTICE '========================================';
END $$;

-- 4. SOLUCIÓN TEMPORAL: Crear política más permisiva para admin
-- Esta política verifica directamente el user_id del JWT
DROP POLICY IF EXISTS "admin_direct_access_docs" ON processed_documents;
CREATE POLICY "admin_direct_access_docs"
ON processed_documents
FOR ALL
TO authenticated
USING (
  -- Verificar si el user_id del JWT corresponde a un admin
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
      auth.uid()
    )
      AND r.name = 'admin'
      AND u.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
      auth.uid()
    )
      AND r.name = 'admin'
      AND u.is_active = true
  )
);

-- 5. También actualizar la política de lectura
DROP POLICY IF EXISTS "admin_read_access_docs" ON processed_documents;
CREATE POLICY "admin_read_access_docs"
ON processed_documents
FOR SELECT
TO authenticated
USING (
  -- Admin puede leer todo
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
      auth.uid()
    )
      AND r.name = 'admin'
      AND u.is_active = true
  )
  OR
  -- Otros roles ven documentos de su institución
  (institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
);

-- 6. Verificar políticas finales
SELECT 
    'Políticas finales' as check_type,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- 7. IMPORTANTE: Instrucciones
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POLÍTICAS ACTUALIZADAS:';
    RAISE NOTICE '';
    RAISE NOTICE 'Se crearon políticas adicionales que';
    RAISE NOTICE 'verifican directamente el JWT token.';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Recarga la página /admin/documents';
    RAISE NOTICE '2. Abre la consola del navegador (F12)';
    RAISE NOTICE '3. Ejecuta este código:';
    RAISE NOTICE '';
    RAISE NOTICE '   const { data, error } = await supabase';
    RAISE NOTICE '     .from("processed_documents")';
    RAISE NOTICE '     .select("*")';
    RAISE NOTICE '     .order("created_at", { ascending: false });';
    RAISE NOTICE '   console.log("Docs:", data, "Error:", error);';
    RAISE NOTICE '';
    RAISE NOTICE '4. Comparte el resultado';
    RAISE NOTICE '========================================';
END $$;

