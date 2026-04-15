-- check_quiz_status.sql
-- Verifies the existence and status of a specific quiz

DO $$
DECLARE
    v_quiz_id UUID := '8c8092d9-53f9-4bf9-b9f2-56e2e772f05a';
    v_exists BOOLEAN;
    v_quiz RECORD;
    v_question_count INTEGER;
BEGIN
    -- Check if quiz exists
    SELECT EXISTS(SELECT 1 FROM public.assessments WHERE id = v_quiz_id) INTO v_exists;
    
    IF NOT v_exists THEN
        RAISE NOTICE '❌ Quiz % NO EXISTE en la base de datos.', v_quiz_id;
        RETURN;
    END IF;

    -- Get quiz details
    SELECT * INTO v_quiz FROM public.assessments WHERE id = v_quiz_id;
    
    RAISE NOTICE '✅ Quiz ENCONTRADO:';
    RAISE NOTICE '   ID: %', v_quiz.id;
    RAISE NOTICE '   Título: %', v_quiz.title;
    RAISE NOTICE '   Course ID: %', v_quiz.course_id;
    RAISE NOTICE '   Publicado: %', v_quiz.is_published;
    RAISE NOTICE '   Activo: %', v_quiz.is_active;
    RAISE NOTICE '   Tipo: %', v_quiz.assessment_type;
    
    -- Count questions
    SELECT COUNT(*) INTO v_question_count FROM public.questions WHERE assessment_id = v_quiz_id;
    RAISE NOTICE '   Cantidad de preguntas: %', v_question_count;

    -- Check course details
    DECLARE
        v_course_name TEXT;
    BEGIN
        SELECT title INTO v_course_name FROM public.courses WHERE id = v_quiz.course_id;
        RAISE NOTICE '   Curso: % (ID: %)', v_course_name, v_quiz.course_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Error al obtener detalles del curso.';
    END;

END $$;
