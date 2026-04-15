-- FIX: RLS y RPC para Comunicaciones y Gestión Académica (Versión Corregida)
-- Fecha: 2026-02-18
-- Corrección: Uso de user_institutions para verificación de campus

-- =================================================================
-- 1. MEJORAS RLS PARA GESTIÓN ACADÉMICA
-- =================================================================

-- Permitir que Profesores y Administradores vean inscripciones de sus instituciones
DROP POLICY IF EXISTS "Students can view own enrollment" ON public.career_enrollments;
DROP POLICY IF EXISTS "Users can view relevant enrollments" ON public.career_enrollments;

CREATE POLICY "Users can view relevant enrollments" ON public.career_enrollments
    FOR SELECT USING (
        -- El estudiante ve su propia inscripción
        (auth.uid() = student_id)
        OR 
        -- Profesores y Admins ven inscripciones de estudiantes de su misma institución
        EXISTS (
            SELECT 1 FROM public.users u_viewer
            JOIN public.roles r ON u_viewer.role_id = r.id
            WHERE u_viewer.id = auth.uid()
            AND (
                r.name = 'admin' -- Global admin ve todo
                OR (
                    r.name IN ('admin-campus', 'coordinator', 'teacher', 'supervisor')
                    AND EXISTS (
                        -- Comparten al menos una institución (vía user_institutions)
                        SELECT 1 FROM public.user_institutions ui_viewer
                        JOIN public.user_institutions ui_student ON ui_viewer.institution_id = ui_student.institution_id
                        WHERE ui_viewer.user_id = u_viewer.id
                        AND ui_student.user_id = career_enrollments.student_id
                    )
                )
            )
        )
    );

-- Asegurar que se puedan ver carreras y materias
DROP POLICY IF EXISTS "Public read careers" ON public.careers;
CREATE POLICY "Public read careers" ON public.careers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);


-- =================================================================
-- 2. FUNCIONES RPC PARA ANNOUNCEMENTS (Faltantes)
-- =================================================================

-- Eliminamos primero para evitar errores de cambio de tipo de retorno
DROP FUNCTION IF EXISTS public.get_unread_announcements(UUID);
DROP FUNCTION IF EXISTS public.create_announcement_recipients(UUID);
DROP FUNCTION IF EXISTS public.mark_announcement_read(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_announcement_stats(UUID);

-- 2.1 Función para obtener avisos no leídos
CREATE OR REPLACE FUNCTION public.get_unread_announcements(user_uuid UUID)
RETURNS SETOF public.announcements AS $$
BEGIN
    RETURN QUERY
    SELECT a.*
    FROM public.announcements a
    JOIN public.announcement_recipients ar ON a.id = ar.announcement_id
    WHERE ar.recipient_id = user_uuid
      AND ar.read_at IS NULL
      AND a.is_active = true
      AND (a.published_at IS NULL OR a.published_at <= NOW())
      AND (a.expires_at IS NULL OR a.expires_at >= NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.2 Función para crear destinatarios automáticamente
CREATE OR REPLACE FUNCTION public.create_announcement_recipients(announcement_uuid UUID)
RETURNS VOID AS $$
DECLARE
    ann_record RECORD;
BEGIN
    SELECT * INTO ann_record FROM public.announcements WHERE id = announcement_uuid;
    
    IF ann_record.scope = 'all' THEN
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id)
        SELECT ann_record.id, u.id
        FROM public.users u
        LEFT JOIN public.user_institutions ui ON u.id = ui.user_id
        WHERE u.is_active = true
          AND (ann_record.institution_id IS NULL OR ui.institution_id = ann_record.institution_id)
        ON CONFLICT DO NOTHING;
        
    ELSIF ann_record.scope = 'role' AND ann_record.target_role_id IS NOT NULL THEN
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id)
        SELECT ann_record.id, u.id
        FROM public.users u
        LEFT JOIN public.user_institutions ui ON u.id = ui.user_id
        WHERE u.role_id = ann_record.target_role_id
          AND u.is_active = true
          AND (ann_record.institution_id IS NULL OR ui.institution_id = ann_record.institution_id)
        ON CONFLICT DO NOTHING;

    ELSIF ann_record.scope = 'career' AND ann_record.target_career_id IS NOT NULL THEN
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id)
        SELECT ann_record.id, ce.student_id
        FROM public.career_enrollments ce
        WHERE ce.career_id = ann_record.target_career_id
          AND ce.status = 'active'
        ON CONFLICT DO NOTHING;
        
    ELSIF ann_record.scope = 'course' AND ann_record.target_course_id IS NOT NULL THEN
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id)
        SELECT ann_record.id, ce.student_id
        FROM public.course_enrollments ce
        WHERE ce.course_id = ann_record.target_course_id
          AND ce.status = 'active'
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 Marcar aviso como leído
CREATE OR REPLACE FUNCTION public.mark_announcement_read(announcement_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.announcement_recipients
    SET read_at = NOW()
    WHERE announcement_id = announcement_uuid
      AND recipient_id = user_uuid
      AND read_at IS NULL;
      
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.4 Obtener estadísticas de un aviso
CREATE OR REPLACE FUNCTION public.get_announcement_stats(announcement_uuid UUID)
RETURNS TABLE (
    total_recipients BIGINT,
    received_count BIGINT,
    read_count BIGINT,
    unread_count BIGINT,
    read_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_recipients,
        COUNT(received_at)::BIGINT as received_count,
        COUNT(read_at)::BIGINT as read_count,
        (COUNT(*) - COUNT(read_at))::BIGINT as unread_count,
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(read_at)::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0
        END as read_percentage
    FROM public.announcement_recipients
    WHERE announcement_id = announcement_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_unread_announcements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_announcement_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_announcement_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_announcement_recipients(UUID) TO authenticated;
