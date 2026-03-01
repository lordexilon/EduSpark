-- =====================================================
-- SOLUCIÓN FINAL CORRECTA: INSERT -> FK -> DELETE
-- =====================================================

BEGIN;

-- PASO 1: INSERT registro nuevo con auth_id
-- Temporalmente cambiar email E identity_document del viejo para evitar conflicts
UPDATE public.users 
SET email = 'TEMP_barretoisaacdavid97@gmail.com',
    identity_document = 'TEMP_4555112'
WHERE id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

-- Insertar nuevo con datos correctos
INSERT INTO public.users (id, email, first_name, last_name, avatar_url, created_at, updated_at, role_id, email_verified, is_active, identity_document, identity_document_type)
SELECT 
    '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2'::uuid,
    'barretoisaacdavid97@gmail.com',
    first_name, 
    last_name, 
    avatar_url, 
    created_at, 
    updated_at, 
    role_id, 
    email_verified, 
    is_active, 
    '4555112' as identity_document,  -- Restaurar el documento original
    identity_document_type
FROM public.users WHERE email = 'TEMP_barretoisaacdavid97@gmail.com';

-- PASO 2: Actualizar TODAS las FKs
UPDATE public.career_institution_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.subject_institution_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.courses SET teacher_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE teacher_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.assignment_submissions SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.tutor_conversations SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.student_learning_profiles SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.enrollments SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.careers SET coordinator_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE coordinator_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.career_enrollments SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.assessments SET created_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE created_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.course_enrollments SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.subject_assignments SET teacher_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE teacher_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.subject_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.unit_progress SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.session_progress SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.assessment_attempts SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.question_responses SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.user_google_tokens SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.announcement_recipients SET recipient_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE recipient_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.video_viewing_progress SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.conversations SET participant1_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE participant1_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.conversations SET participant2_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE participant2_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.messages SET sender_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE sender_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.forum_topics SET created_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE created_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.forum_replies SET author_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE author_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.announcements SET author_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE author_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.tutor_interactions SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.student_tutor_performance SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.tutor_usage_limits SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.file_processing_jobs SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.tutor_message_ratings SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.ai_usage_tracking SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.document_session_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.user_tutorials SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.tutor_cost_tracking SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.tutor_cost_limits SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.flashcards SET created_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE created_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.flashcard_progress SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.material_course_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.material_session_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.payments SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.processing_costs SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.user_query_limits SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.user_institutions SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.material_unit_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.processed_documents SET processed_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE processed_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.document_course_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.document_career_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.document_unit_assignments SET assigned_by = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE assigned_by = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.student_subscriptions SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.user_daily_tutor_usage SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.tutor_general_knowledge_responses SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';
UPDATE public.user_devices SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

-- PASO 3: Eliminar registro viejo
DELETE FROM public.users WHERE id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

COMMIT;

-- Verificar
SELECT 
    au.email,
    au.id as auth_id,
    pu.id as public_id,
    CASE WHEN au.id = pu.id THEN '✅ SINCRONIZADO!' ELSE '❌ Falló' END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'barretoisaacdavid97@gmail.com';
