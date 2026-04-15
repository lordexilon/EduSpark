-- =====================================================
-- SOLUCIÓN DEFINITIVA: INSERT-UPDATE-DELETE
-- =====================================================
-- Strategy: Crear nuevo registro con auth_id, mover FKs, eliminar viejo
-- =====================================================

DO $$
DECLARE
    v_email TEXT;
    v_auth_id UUID;
    v_public_id UUID;
    v_user_record RECORD;
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
        'melgarejo.lia98@gmail.com'
    ];
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE '🔄 SINCRONIZACIÓN: INSERT-UPDATE-DELETE';
    RAISE NOTICE '========================================================';
    
    FOREACH v_email IN ARRAY v_emails
    LOOP
        v_count := v_count + 1;
        
        BEGIN
            -- Get IDs
            SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
            SELECT * INTO v_user_record FROM public.users WHERE email = v_email;
            v_public_id := v_user_record.id;

            IF v_auth_id IS NULL OR v_public_id IS NULL OR v_auth_id = v_public_id THEN
                CONTINUE;
            END IF;

            RAISE NOTICE '🔧 % - Procesando...', v_email;
            
            -- PASO 1: INSERT nuevo registro con auth_id
            INSERT INTO public.users (
                id, email, first_name, last_name, avatar_url, created_at, updated_at,
                role_id, email_verified, is_active, identity_document, identity_document_type
            ) VALUES (
                v_auth_id,
                v_user_record.email,
                v_user_record.first_name,
                v_user_record.last_name,
                v_user_record.avatar_url,
                v_user_record.created_at,
                v_user_record.updated_at,
                v_user_record.role_id,
                v_user_record.email_verified,
                v_user_record.is_active,
                v_user_record.identity_document,
                v_user_record.identity_document_type
            ) ON CONFLICT (id) DO NOTHING;
            
            -- PASO 2: Actualizar TODAS las FKs
            UPDATE public.user_institutions SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.course_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.career_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.courses SET teacher_id = v_auth_id WHERE teacher_id = v_public_id;
            UPDATE public.conversations SET participant1_id = v_auth_id WHERE participant1_id = v_public_id;
            UPDATE public.conversations SET participant2_id = v_auth_id WHERE participant2_id = v_public_id;
            UPDATE public.messages SET sender_id = v_auth_id WHERE sender_id = v_public_id;
            UPDATE public.enrollments SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.assignment_submissions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.tutor_conversations SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.student_learning_profiles SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.career_institution_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.subject_institution_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.subject_assignments SET teacher_id = v_auth_id WHERE teacher_id = v_public_id;
            UPDATE public.subject_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.unit_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.session_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.assessment_attempts SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.question_responses SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.user_google_tokens SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.announcement_recipients SET recipient_id = v_auth_id WHERE recipient_id = v_public_id;
            UPDATE public.video_viewing_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.forum_topics SET created_by = v_auth_id WHERE created_by = v_public_id;
            UPDATE public.forum_replies SET author_id = v_auth_id WHERE author_id = v_public_id;
            UPDATE public.announcements SET author_id = v_auth_id WHERE author_id = v_public_id;
            UPDATE public.tutor_interactions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.student_tutor_performance SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.tutor_usage_limits SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.file_processing_jobs SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_message_ratings SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.ai_usage_tracking SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.document_session_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.user_tutorials SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_cost_tracking SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_cost_limits SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.flashcards SET created_by = v_auth_id WHERE created_by = v_public_id;
            UPDATE public.flashcard_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.material_course_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.material_session_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.payments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.processing_costs SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.user_query_limits SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.material_unit_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.processed_documents SET processed_by = v_auth_id WHERE processed_by = v_public_id;
            UPDATE public.document_course_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.document_career_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.document_unit_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.student_subscriptions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.user_daily_tutor_usage SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_general_knowledge_responses SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.careers SET coordinator_id = v_auth_id WHERE coordinator_id = v_public_id;
            UPDATE public.assessments SET created_by = v_auth_id WHERE created_by = v_public_id;
            UPDATE public.user_devices SET user_id = v_auth_id WHERE user_id = v_public_id;
            
            -- PASO 3: Eliminar registro viejo
            DELETE FROM public.users WHERE id = v_public_id;

            v_fixed := v_fixed + 1;
            RAISE NOTICE '✅ % - Completado', v_email;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ % - ERROR: % [%]', v_email, SQLERRM, SQLSTATE;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================================';
    RAISE NOTICE '✅ Completado: %/% usuarios', v_fixed, v_count;
    RAISE NOTICE '========================================================';
END $$;

-- VERIFICACIÓN
SELECT 
    au.email,
    CASE 
        WHEN au.id = pu.id THEN '✅ Sincronizado'
        WHEN pu.id IS NULL THEN '⚠️ Sin public.users'
        ELSE '❌ IDs diferentes'
    END as estado,
    SUBSTRING(au.id::TEXT, 1, 13) as auth_id,
    SUBSTRING(pu.id::TEXT, 1, 13) as public_id,
    pu.first_name,
    pu.last_name
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
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
ORDER BY estado, au.email;
