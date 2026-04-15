-- =====================================================
-- SOLUCIÓN FINAL: Sincronizar IDs auth.users <-> public.users
-- Versión COMPLETA con TODAS las 54 tablas con FK
-- =====================================================

DO $$
DECLARE
    v_email TEXT;
    v_auth_id UUID;
    v_public_id UUID;
    v_count INT := 0;
    v_fixed INT := 0;
    
    v_emails TEXT[] := ARRAY[
        'jaraorregojosesebastian@gmail.com',
        'otihidalgo9@gmail.com',
        'deisypinhanez97@gmail.com',
        'eduatobe96@gmail.com',
        'sebastian.riosv00@gmail.com',
        'alecaceres6@outlook.com',
        'florenciadelgado061@gmail.com',
        'cotilaco@gmail.com',
        'magameister11@gmail.com',
        'barretoisaacdavid97@gmail.com',
        'melgarejo.lia98@gmail.com',
        'palomaruizdiaz96@gmail.com'
    ];
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE '🔄 SINCRONIZACIÓN MASIVA DE IDS';
    RAISE NOTICE '========================================================';
    
    FOREACH v_email IN ARRAY v_emails
    LOOP
        v_count := v_count + 1;
        
        BEGIN
            -- Obtener IDs
            SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
            SELECT id INTO v_public_id FROM public.users WHERE email = v_email;

            -- Validaciones
            IF v_auth_id IS NULL THEN
                RAISE WARNING '⚠️ % - No existe en auth.users', v_email;
                CONTINUE;
            END IF;
            
            IF v_public_id IS NULL THEN
                RAISE WARNING '⚠️ % - No existe en public.users', v_email;
                CONTINUE;
            END IF;
            
            IF v_auth_id = v_public_id THEN
                RAISE NOTICE '✅ % - Ya sincronizado', v_email;
                CONTINUE;
            END IF;

            RAISE NOTICE '🔧 % - Sincronizando % -> %', v_email, SUBSTRING(v_public_id::TEXT, 1, 8), SUBSTRING(v_auth_id::TEXT, 1, 8);
            
            -- =============================================
            -- ACTUALIZAR TODAS LAS TABLAS CON FK A users
            -- =============================================
            
            -- Tablas con user_id
            UPDATE public.user_institutions SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.enrollments SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.user_google_tokens SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.user_tutorials SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_usage_limits SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.file_processing_jobs SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.ai_usage_tracking SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_cost_tracking SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_cost_limits SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.processing_costs SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.user_query_limits SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.user_daily_tutor_usage SET user_id = v_auth_id WHERE user_id = v_public_id;
            
            -- Tablas con student_id
            UPDATE public.course_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.career_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.assignment_submissions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.tutor_conversations SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.student_learning_profiles SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.unit_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.session_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.assessment_attempts SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.question_responses SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.video_viewing_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.tutor_interactions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.student_tutor_performance SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.tutor_message_ratings SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.flashcard_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.payments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.student_subscriptions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.tutor_general_knowledge_responses SET student_id = v_auth_id WHERE student_id = v_public_id;
            
            -- Tablas con teacher_id
            UPDATE public.courses SET teacher_id = v_auth_id WHERE teacher_id = v_public_id;
            UPDATE public.subject_assignments SET teacher_id = v_auth_id WHERE teacher_id = v_public_id;
            
            -- Tablas con participant_id
            UPDATE public.conversations SET participant1_id = v_auth_id WHERE participant1_id = v_public_id;
            UPDATE public.conversations SET participant2_id = v_auth_id WHERE participant2_id = v_public_id;
            
            -- Tablas con sender_id / author_id / created_by / assigned_by / processed_by
            UPDATE public.messages SET sender_id = v_auth_id WHERE sender_id = v_public_id;
            UPDATE public.forum_topics SET created_by = v_auth_id WHERE created_by = v_public_id;
            UPDATE public.forum_replies SET author_id = v_auth_id WHERE author_id = v_public_id;
            UPDATE public.announcements SET author_id = v_auth_id WHERE author_id = v_public_id;
            UPDATE public.flashcards SET created_by = v_auth_id WHERE created_by = v_public_id;
            UPDATE public.assessments SET created_by = v_auth_id WHERE created_by = v_public_id;
            UPDATE public.career_institution_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.subject_institution_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.subject_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.document_session_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.material_course_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.material_session_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.material_unit_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.processed_documents SET processed_by = v_auth_id WHERE processed_by = v_public_id;
            UPDATE public.document_course_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.document_career_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.document_unit_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            
            -- Tablas con recipient_id
            UPDATE public.announcement_recipients SET recipient_id = v_auth_id WHERE recipient_id = v_public_id;
            
            -- Tablas con coordinator_id
            UPDATE public.careers SET coordinator_id = v_auth_id WHERE coordinator_id = v_public_id;
            
            -- FINALMENTE: Actualizar public.users
            UPDATE public.users SET id = v_auth_id WHERE id = v_public_id;

            v_fixed := v_fixed + 1;
            RAISE NOTICE '✅ % - Completado', v_email;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ % - ERROR: % (Code: %)', v_email, SQLERRM, SQLSTATE;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================================';
    RAISE NOTICE '✅ Sincronización finalizada: %/% usuarios', v_fixed, v_count;
    RAISE NOTICE '========================================================';
END $$;

-- VERIFICACIÓN
SELECT 
    au.email,
    CASE 
        WHEN au.id = pu.id THEN '✅ Sincronizado'
        ELSE '❌ Desincronizado'
    END as estado,
    SUBSTRING(au.id::TEXT, 1, 13) as auth_id,
    SUBSTRING(pu.id::TEXT, 1, 13) as public_id
FROM auth.users au
JOIN public.users pu ON au.email = pu.email
WHERE au.email = ANY(ARRAY[
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'sebastian.riosv00@gmail.com',
    'alecaceres6@outlook.com',
    'florenciadelgado061@gmail.com',
    'cotilaco@gmail.com',
    'magameister11@gmail.com',
    'barretoisaacdavid97@gmail.com',
    'melgarejo.lia98@gmail.com',
    'palomaruizdiaz96@gmail.com'
])
ORDER BY estado DESC, au.email;
