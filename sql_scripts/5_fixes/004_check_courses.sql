-- Check courses for institution 2
DO $$
DECLARE
    v_count integer;
    v_courses_null integer;
BEGIN
    SELECT count(*) INTO v_count FROM courses WHERE institution_id = 2;
    RAISE NOTICE 'Courses for institution 2: %', v_count;

    SELECT count(*) INTO v_courses_null FROM courses WHERE institution_id IS NULL;
    RAISE NOTICE 'Courses with NULL institution: %', v_courses_null;
END $$;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'courses';
