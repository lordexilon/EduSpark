-- Diagnostic Script: List all RLS policies for critical tables
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
WHERE tablename IN ('careers', 'subjects', 'courses', 'assessments', 'flashcards', 'users')
ORDER BY tablename, policyname;
