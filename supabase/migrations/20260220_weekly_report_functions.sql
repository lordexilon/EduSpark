-- Función para obtener estudiantes que necesitan reporte semanal
-- Se basa en actividad reciente (últimos 7 días) y falta de reporte para la semana actual

CREATE OR REPLACE FUNCTION public.get_students_needing_weekly_report(
    p_week_number INTEGER,
    p_year INTEGER,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    student_id UUID,
    course_id INTEGER,
    interaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH active_students AS (
        -- Estudiantes con interacción en los últimos 7 días
        SELECT 
            ti.student_id, 
            ti.course_id,
            COUNT(*) as i_count
        FROM public.tutor_interactions ti
        WHERE ti.created_at > (NOW() - INTERVAL '7 days')
        GROUP BY ti.student_id, ti.course_id
        HAVING COUNT(*) >= 3 -- Mínimo 3 interacciones para justificar un reporte
    )
    SELECT 
        ast.student_id,
        ast.course_id,
        ast.i_count
    FROM active_students ast
    WHERE NOT EXISTS (
        -- Que no tengan ya el reporte de esta semana
        SELECT 1 
        FROM public.tutor_weekly_reports twr 
        WHERE twr.student_id = ast.student_id 
          AND twr.course_id = ast.course_id
          AND twr.week_number = p_week_number
          AND twr.year = p_year
    )
    LIMIT p_limit;
END;
$$;

-- Función para agregar actividad semanal de un estudiante (para alimentar al LLM)
CREATE OR REPLACE FUNCTION public.get_student_weekly_activity(
    p_student_id UUID,
    p_course_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_interactions JSONB;
    v_progress JSONB;
    v_start_date TIMESTAMPTZ := NOW() - INTERVAL '7 days';
BEGIN
    -- 1. Obtener interacciones recientes (preguntas y temas)
    SELECT JSONB_AGG(t) INTO v_interactions
    FROM (
        SELECT 
            question, 
            topic, 
            intention,
            created_at
        FROM public.tutor_interactions
        WHERE student_id = p_student_id 
          AND course_id = p_course_id
          AND created_at > v_start_date
        ORDER BY created_at DESC
        LIMIT 20
    ) t;

    -- 2. Obtener progreso en unidades/sesiones
    SELECT JSONB_BUILD_OBJECT(
        'completed_units', COUNT(DISTINCT up.unit_id) FILTER (WHERE up.is_completed AND up.updated_at > v_start_date),
        'total_units_completed', COUNT(DISTINCT up.unit_id) FILTER (WHERE up.is_completed),
        'last_access', MAX(e.last_accessed)
    ) INTO v_progress
    FROM public.enrollments e
    LEFT JOIN public.unit_progress up ON up.enrollment_id = e.id
    WHERE e.student_id = p_student_id AND e.course_id = p_course_id;

    RETURN JSONB_BUILD_OBJECT(
        'interactions', COALESCE(v_interactions, '[]'::jsonb),
        'progress', v_progress,
        'period_start', v_start_date,
        'period_end', NOW()
    );
END;
$$;
