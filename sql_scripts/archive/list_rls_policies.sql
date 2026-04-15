-- Ver TODAS las políticas RLS activas en processed_documents
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'processed_documents'
ORDER BY policyname;

-- Ver políticas en document_course_assignments
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'document_course_assignments'
ORDER BY policyname;
