-- Crear política RLS para permitir que los usuarios eliminen sus propios jobs
-- Ejecutar en el SQL Editor de Supabase

-- Verificar si RLS está habilitado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'file_processing_jobs' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE public.file_processing_jobs ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado en file_processing_jobs';
    ELSE
        RAISE NOTICE 'RLS ya está habilitado en file_processing_jobs';
    END IF;
END $$;

-- Eliminar política DELETE existente si existe (para recrearla)
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.file_processing_jobs;
DROP POLICY IF EXISTS "file_processing_jobs_delete_own" ON public.file_processing_jobs;
DROP POLICY IF EXISTS "file_processing_jobs_users_delete" ON public.file_processing_jobs;

-- Crear política para permitir que los usuarios eliminen sus propios jobs
CREATE POLICY "Users can delete own jobs" ON public.file_processing_jobs
    FOR DELETE 
    TO authenticated
    USING (user_id = auth.uid());

-- Verificar que la política se creó correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'file_processing_jobs'
AND cmd = 'DELETE';

-- Verificar todas las políticas para file_processing_jobs
SELECT 
    policyname,
    cmd as command,
    permissive,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'file_processing_jobs'
ORDER BY cmd, policyname;

-- Probar la política (opcional, comentar si no se necesita)
-- DELETE FROM file_processing_jobs 
-- WHERE id = '89a35fba-649a-41fc-8b10-4d7c32c4896b' 
-- AND user_id = auth.uid();

