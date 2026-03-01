-- =====================================================
-- FIX FINAL: Una sola política clara para admin
-- =====================================================
-- Eliminar todas las políticas y crear una sola política simple

-- 1. Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "admin_direct_access_docs" ON processed_documents;
DROP POLICY IF EXISTS "admin_full_access_docs" ON processed_documents;
DROP POLICY IF EXISTS "admin_read_access_docs" ON processed_documents;
DROP POLICY IF EXISTS "view_institution_docs" ON processed_documents;

-- 2. Crear UNA SOLA política para SELECT (lectura)
CREATE POLICY "processed_documents_select_policy"
ON processed_documents
FOR SELECT
TO authenticated
USING (
  -- Admin puede ver TODO
  -- Verificamos directamente en la política usando JWT o auth.uid()
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = COALESCE(
      NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
      auth.uid()
    )
      AND r.name = 'admin'
      AND u.is_active = true
  )
  OR
  -- Admin-campus y coordinator ven documentos de su institución
  (
    EXISTS (
      SELECT 1 
      FROM public.users u 
      JOIN public.roles r ON u.role_id = r.id 
      WHERE u.id = COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
      )
        AND r.name IN ('admin-campus', 'coordinator')
        AND u.is_active = true
    )
    AND institution_id = public.get_user_institution_id()
    AND public.get_user_institution_id() IS NOT NULL
  )
  OR
  -- Otros usuarios ven documentos de su institución
  (
    institution_id = public.get_user_institution_id()
    AND public.get_user_institution_id() IS NOT NULL
  )
);

-- 3. Crear UNA SOLA política para INSERT/UPDATE/DELETE
CREATE POLICY "processed_documents_modify_policy"
ON processed_documents
FOR ALL
TO authenticated
USING (
  -- Misma lógica que SELECT
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = COALESCE(
      NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
      auth.uid()
    )
      AND r.name = 'admin'
      AND u.is_active = true
  )
  OR
  (
    EXISTS (
      SELECT 1 
      FROM public.users u 
      JOIN public.roles r ON u.role_id = r.id 
      WHERE u.id = COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
      )
        AND r.name IN ('admin-campus', 'coordinator')
        AND u.is_active = true
    )
    AND institution_id = public.get_user_institution_id()
    AND public.get_user_institution_id() IS NOT NULL
  )
)
WITH CHECK (
  -- Misma lógica para WITH CHECK
  EXISTS (
    SELECT 1 
    FROM public.users u 
    JOIN public.roles r ON u.role_id = r.id 
    WHERE u.id = COALESCE(
      NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
      auth.uid()
    )
      AND r.name = 'admin'
      AND u.is_active = true
  )
  OR
  (
    EXISTS (
      SELECT 1 
      FROM public.users u 
      JOIN public.roles r ON u.role_id = r.id 
      WHERE u.id = COALESCE(
        NULLIF((current_setting('request.jwt.claims', true)::json->>'sub'), '')::uuid,
        auth.uid()
      )
        AND r.name IN ('admin-campus', 'coordinator')
        AND u.is_active = true
    )
    AND institution_id = public.get_user_institution_id()
    AND public.get_user_institution_id() IS NOT NULL
  )
);

-- 4. Verificar políticas finales
SELECT 
    'Políticas finales' as check_type,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Política de lectura'
        WHEN cmd = 'ALL' THEN '✅ Política de modificación'
        ELSE '⚠️ Revisar'
    END as description
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY cmd, policyname;

-- 5. Verificar que hay documentos
SELECT 
    'Documentos en BD' as check_type,
    COUNT(*) as total
FROM processed_documents;

-- 6. Instrucciones finales
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX FINAL APLICADO:';
    RAISE NOTICE '';
    RAISE NOTICE 'Se eliminaron todas las políticas duplicadas';
    RAISE NOTICE 'y se crearon 2 políticas simples:';
    RAISE NOTICE '  1. SELECT: Para lectura';
    RAISE NOTICE '  2. ALL: Para INSERT/UPDATE/DELETE';
    RAISE NOTICE '';
    RAISE NOTICE 'Las políticas verifican directamente el JWT';
    RAISE NOTICE 'y usan auth.uid() como fallback.';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Recarga la página /admin/documents';
    RAISE NOTICE '2. Deberías ver los 2 documentos';
    RAISE NOTICE '';
    RAISE NOTICE 'Si aún no funciona, ejecuta en la consola:';
    RAISE NOTICE '  const { data } = await supabase';
    RAISE NOTICE '    .from("processed_documents")';
    RAISE NOTICE '    .select("*");';
    RAISE NOTICE '  console.log(data);';
    RAISE NOTICE '========================================';
END $$;

