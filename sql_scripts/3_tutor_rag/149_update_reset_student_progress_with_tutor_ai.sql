-- 149_update_reset_student_progress_with_tutor_ai.sql
-- Actualización del sistema de reset de progreso para incluir eliminación de registros del Tutor AI
-- Este script actualiza la función reset_student_course_progress para eliminar también:
-- - tutor_messages (mensajes del tutor)
-- - tutor_interactions (interacciones detalladas)
-- - tutor_conversations (conversaciones)
-- - student_tutor_performance (métricas agregadas)
--
-- Fecha: Enero 2025
-- Descripción: Mejora del botón de reset para tener un sistema completamente limpio

-- =====================================================
-- ACTUALIZAR FUNCIÓN: Resetear progreso de un estudiante en un curso
-- =====================================================

CREATE OR REPLACE FUNCTION reset_student_course_progress(
    p_student_id UUID,
    p_course_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_deleted_unit_progress INTEGER := 0;
    v_deleted_session_progress INTEGER := 0;
    v_deleted_flashcard_progress INTEGER := 0;
    v_deleted_assessment_attempts INTEGER := 0;
    v_deleted_assignment_submissions INTEGER := 0;
    v_deleted_tutor_messages INTEGER := 0;
    v_deleted_tutor_interactions INTEGER := 0;
    v_deleted_tutor_conversations INTEGER := 0;
    v_deleted_tutor_performance INTEGER := 0;
    v_updated_enrollments INTEGER := 0;
    v_user_role TEXT;
BEGIN
    -- Verificar permisos: solo admin, coordinator, admin-campus o teacher del curso pueden resetear
    SELECT r.name INTO v_user_role
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid();
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Si no es admin, coordinator o admin-campus, verificar que sea teacher del curso
    IF v_user_role NOT IN ('admin', 'coordinator', 'admin-campus') THEN
        IF v_user_role != 'teacher' OR NOT EXISTS (
            SELECT 1 FROM public.courses
            WHERE id = p_course_id
              AND teacher_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'No tienes permisos para resetear el progreso en este curso';
        END IF;
    END IF;
    
    -- Verificar que el estudiante esté inscrito en el curso
    IF NOT EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE student_id = p_student_id
          AND course_id = p_course_id
          AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'El estudiante no está inscrito activamente en este curso';
    END IF;

    -- 1. Eliminar progreso de unidades
    DELETE FROM public.unit_progress
    WHERE student_id = p_student_id
      AND course_id = p_course_id;
    GET DIAGNOSTICS v_deleted_unit_progress = ROW_COUNT;

    -- 2. Eliminar progreso de sesiones
    DELETE FROM public.session_progress
    WHERE student_id = p_student_id
      AND course_id = p_course_id;
    GET DIAGNOSTICS v_deleted_session_progress = ROW_COUNT;

    -- 3. Eliminar progreso de flashcards
    DELETE FROM public.flashcard_progress
    WHERE student_id = p_student_id
      AND flashcard_id IN (
          SELECT id FROM public.flashcards
          WHERE course_id = p_course_id
      );
    GET DIAGNOSTICS v_deleted_flashcard_progress = ROW_COUNT;

    -- 4. Eliminar intentos de quizzes/trivias/exámenes
    DELETE FROM public.assessment_attempts
    WHERE student_id = p_student_id
      AND assessment_id IN (
          SELECT id FROM public.assessments
          WHERE course_id = p_course_id
      );
    GET DIAGNOSTICS v_deleted_assessment_attempts = ROW_COUNT;

    -- 5. Eliminar entregas de tareas
    DELETE FROM public.assignment_submissions
    WHERE student_id = p_student_id
      AND assignment_id IN (
          SELECT id FROM public.assignments
          WHERE course_id = p_course_id
      );
    GET DIAGNOSTICS v_deleted_assignment_submissions = ROW_COUNT;

    -- 6. Eliminar mensajes del tutor (antes de eliminar conversaciones)
    DELETE FROM public.tutor_messages
    WHERE conversation_id IN (
        SELECT id FROM public.tutor_conversations
        WHERE student_id = p_student_id
          AND course_id = p_course_id
    );
    GET DIAGNOSTICS v_deleted_tutor_messages = ROW_COUNT;

    -- 7. Eliminar interacciones del tutor
    DELETE FROM public.tutor_interactions
    WHERE student_id = p_student_id
      AND course_id = p_course_id;
    GET DIAGNOSTICS v_deleted_tutor_interactions = ROW_COUNT;

    -- 8. Eliminar conversaciones del tutor
    DELETE FROM public.tutor_conversations
    WHERE student_id = p_student_id
      AND course_id = p_course_id;
    GET DIAGNOSTICS v_deleted_tutor_conversations = ROW_COUNT;

    -- 9. Eliminar métricas de rendimiento del tutor
    DELETE FROM public.student_tutor_performance
    WHERE student_id = p_student_id
      AND course_id = p_course_id;
    GET DIAGNOSTICS v_deleted_tutor_performance = ROW_COUNT;

    -- 10. Resetear datos de inscripción en course_enrollments
    UPDATE public.course_enrollments
    SET 
        completion_percentage = 0.00,
        time_spent_minutes = 0,
        attendance_percentage = 0.00,
        participation_score = 0.00,
        final_grade = NULL,
        letter_grade = NULL,
        completed_at = NULL,
        last_access_at = NULL,
        updated_at = NOW()
    WHERE student_id = p_student_id
      AND course_id = p_course_id;
    GET DIAGNOSTICS v_updated_enrollments = ROW_COUNT;

    -- Construir resultado
    v_result := jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'course_id', p_course_id,
        'deleted', jsonb_build_object(
            'unit_progress', v_deleted_unit_progress,
            'session_progress', v_deleted_session_progress,
            'flashcard_progress', v_deleted_flashcard_progress,
            'assessment_attempts', v_deleted_assessment_attempts,
            'assignment_submissions', v_deleted_assignment_submissions,
            'tutor_messages', v_deleted_tutor_messages,
            'tutor_interactions', v_deleted_tutor_interactions,
            'tutor_conversations', v_deleted_tutor_conversations,
            'tutor_performance', v_deleted_tutor_performance
        ),
        'updated_enrollments', v_updated_enrollments,
        'message', 'Progreso del estudiante reseteado exitosamente (incluyendo registros del Tutor AI)'
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Error al resetear el progreso del estudiante'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ACTUALIZAR COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION reset_student_course_progress(UUID, INTEGER) IS 
'Resetea completamente el progreso de un estudiante en un curso específico.
Elimina: unit_progress, session_progress, flashcard_progress, assessment_attempts, assignment_submissions,
tutor_messages, tutor_interactions, tutor_conversations, student_tutor_performance.
Resetea: course_enrollments (completion_percentage, time_spent_minutes, etc.).
Actualizado en Enero 2025 para incluir eliminación de registros del Tutor AI.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    'Función actualizada exitosamente' as status,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'reset_student_course_progress'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

