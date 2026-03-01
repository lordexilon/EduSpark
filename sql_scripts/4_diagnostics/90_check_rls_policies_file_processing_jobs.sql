-- Verificar políticas RLS para file_processing_jobs
-- Este script ayuda a diagnosticar problemas de permisos al eliminar jobs

-- Ver si RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'file_processing_jobs';

-- Ver todas las políticas para file_processing_jobs
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command, -- SELECT, INSERT, UPDATE, DELETE, ALL
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'file_processing_jobs';

-- Verificar si el usuario actual puede eliminar jobs
-- Ejecutar esto como el usuario autenticado
SELECT 
    id,
    file_name,
    user_id,
    auth.uid() as current_user_id,
    CASE 
        WHEN user_id = auth.uid() THEN 'Puede eliminar (es el dueño)'
        ELSE 'NO puede eliminar (no es el dueño)'
    END as delete_permission
FROM file_processing_jobs
WHERE id IN (
    '89a35fba-649a-41fc-8b10-4d7c32c4896b',
    '6172b586-5f1a-44a1-9591-2bd670c697f5'
);

-- Si no hay políticas DELETE, crear una temporal para permitir que los usuarios eliminen sus propios jobs
-- NOTA: Solo ejecutar si es necesario y después de verificar que no hay políticas existentes

-- CREATE POLICY "Users can delete own jobs" ON public.file_processing_jobs
--     FOR DELETE TO authenticated
--     USING (user_id = auth.uid());

