-- debug_quiz_access.sql
-- Direct query to check quiz details without PL/pgSQL blocks

SELECT 
    id, 
    title, 
    course_id, 
    is_published, 
    is_active, 
    assessment_type,
    created_at
FROM public.assessments 
WHERE id = '8c8092d9-53f9-4bf9-b9f2-56e2e772f05a';

-- Check questions count
SELECT count(*) as question_count 
FROM public.questions 
WHERE assessment_id = '8c8092d9-53f9-4bf9-b9f2-56e2e772f05a';
