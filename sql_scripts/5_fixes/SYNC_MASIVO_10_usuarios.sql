-- =====================================================
-- SINCRONIZACIÓN MASIVA: 10 usuarios restantes
-- =====================================================
-- Basado en el script exitoso de barretoisaacdavid97@gmail.com
-- =====================================================

-- Mapeo de usuarios (auth_id -> public_id)
-- alecaceres6@outlook.com: f32382ae-0c9c -> 69c36c20-c0bf
-- cotilaco@gmail.com: f87229bd-c54a -> d4bc22f7-cf23
-- deisypinhanez97@gmail.com: 77f46a91-17a4 -> ba7bfc03-1bab
-- eduatobe96@gmail.com: 9c030bce-c89f -> 3076db90-51e1
-- florenciadelgado061@gmail.com: 84ab0a98-0c71 -> 13d689b8-afa9
-- jaraorregojosesebastian@gmail.com: 42de8c58-4402 -> a7b71e72-e4c0
-- magameister11@gmail.com: a6baaf10-76b2 -> ac0e6e1f-c3ff
-- melgarejo.lia98@gmail.com: 71849df4-fd67 -> 11215074-a65c
-- otihidalgo9@gmail.com: 43468f82-4918 -> 85c02afb-0a6b
-- sebastian.riosv00@gmail.com: 13d2b366-1ea5 -> afdcf53f-9256

DO $$
DECLARE
    v_emails TEXT[] := ARRAY[
        'alecaceres6@outlook.com',
        'cotilaco@gmail.com',
        'deisypinhanez97@gmail.com',
        'eduatobe96@gmail.com',
        'florenciadelgado061@gmail.com',
        'jaraorregojosesebastian@gmail.com',
        'magameister11@gmail.com',
        'melgarejo.lia98@gmail.com',
        'otihidalgo9@gmail.com',
        'sebastian.riosv00@gmail.com'
    ];
    
    v_email TEXT;
    v_auth_id UUID;
    v_public_id UUID;
    v_temp_email TEXT;
    v_temp_doc TEXT;
    v_identity_doc TEXT;
    v_count INT := 0;
    v_success INT := 0;
    
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE '🔄 SINCRONIZACIÓN MASIVA - 10 usuarios';
    RAISE NOTICE '========================================================';
    
    FOREACH v_email IN ARRAY v_emails
    LOOP
        v_count := v_count + 1;
        
        BEGIN
            -- Obtener IDs
            SELECT id INTO v_auth_id FROM auth.users WHERE email = v_email;
            SELECT id, identity_document INTO v_public_id, v_identity_doc 
            FROM public.users WHERE email = v_email;
            
            IF v_auth_id IS NULL OR v_public_id IS NULL THEN
                RAISE WARNING '⚠️ % - Usuario no encontrado en ambas tablas', v_email;
                CONTINUE;
            END IF;
            
            IF v_auth_id = v_public_id THEN
                RAISE NOTICE '✅ % - Ya sincronizado', v_email;
                v_success := v_success + 1;
                CONTINUE;
            END IF;
            
            RAISE NOTICE '🔧 % - Procesando...', v_email;
            
            -- Preparar valores temporales
            v_temp_email := 'TEMP_' || v_email;
            v_temp_doc := 'TEMP_' || COALESCE(v_identity_doc, 'NODOC');
            
            -- PASO 1: Cambiar email e identity_document temporalmente
            UPDATE public.users 
            SET email = v_temp_email,
                identity_document = v_temp_doc
            WHERE id = v_public_id;
            
            -- PASO 2: INSERT nuevo registro con auth_id
            INSERT INTO public.users (
id, email, first_name, last_name, avatar_url, created_at, updated_at,
                role_id, email_verified, is_active, identity_document, identity_document_type
            )
            SELECT 
                v_auth_id,
                v_email,
                first_name, last_name, avatar_url, created_at, updated_at,
                role_id, email_verified, is_active, v_identity_doc, identity_document_type
            FROM public.users WHERE email = v_temp_email;
            
            -- PASO 3: Actualizar TODAS las FK
            UPDATE public.career_institution_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.subject_institution_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.courses SET teacher_id = v_auth_id WHERE teacher_id = v_public_id;
            UPDATE public.assignment_submissions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.tutor_conversations SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.student_learning_profiles SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.enrollments SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.careers SET coordinator_id = v_auth_id WHERE coordinator_id = v_public_id;
            UPDATE public.career_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.assessments SET created_by = v_auth_id WHERE created_by = v_public_id;
            UPDATE public.course_enrollments SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.subject_assignments SET teacher_id = v_auth_id WHERE teacher_id = v_public_id;
            UPDATE public.subject_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.unit_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.session_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.assessment_attempts SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.question_responses SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.user_google_tokens SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.announcement_recipients SET recipient_id = v_auth_id WHERE recipient_id = v_public_id;
            UPDATE public.video_viewing_progress SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.conversations SET participant1_id = v_auth_id WHERE participant1_id = v_public_id;
            UPDATE public.conversations SET participant2_id = v_auth_id WHERE participant2_id = v_public_id;
            UPDATE public.messages SET sender_id = v_auth_id WHERE sender_id = v_public_id;
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
            UPDATE public.user_institutions SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.material_unit_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.processed_documents SET processed_by = v_auth_id WHERE processed_by = v_public_id;
            UPDATE public.document_course_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.document_career_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.document_unit_assignments SET assigned_by = v_auth_id WHERE assigned_by = v_public_id;
            UPDATE public.student_subscriptions SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.user_daily_tutor_usage SET user_id = v_auth_id WHERE user_id = v_public_id;
            UPDATE public.tutor_general_knowledge_responses SET student_id = v_auth_id WHERE student_id = v_public_id;
            UPDATE public.user_devices SET user_id = v_auth_id WHERE user_id = v_public_id;
            
            -- PASO 4: Eliminar registro viejo
            DELETE FROM public.users WHERE id = v_public_id;
            
            v_success := v_success + 1;
            RAISE NOTICE '✅ % - Completado', v_email;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ % - ERROR: % [%]', v_email, SQLERRM, SQLSTATE;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================================';
    RAISE NOTICE '✅ Completado: %/% usuarios sincronizados', v_success, v_count;
    RAISE NOTICE '========================================================';
END $$;

-- VERIFICACIÓN
SELECT 
    au.email,
    CASE 
        WHEN au.id = pu.id THEN '✅ Sincronizado'
        ELSE '❌ IDs diferentes'
    END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
WHERE au.email = ANY(ARRAY[
    'alecaceres6@outlook.com',
    'cotilaco@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'florenciadelgado061@gmail.com',
    'jaraorregojosesebastian@gmail.com',
    'magameister11@gmail.com',
    'melgarejo.lia98@gmail.com',
    'otihidalgo9@gmail.com',
    'sebastian.riosv00@gmail.com'
])
ORDER BY estado DESC, au.email;
