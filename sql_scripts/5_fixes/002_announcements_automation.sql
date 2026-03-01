-- ==============================================================================
-- AUTOMATIZACIÓN DE AVISOS PARA NUEVOS USUARIOS Y ENROLAMIENTOS
-- ==============================================================================
-- Este script crea triggers para asignar automáticamente los avisos existentes
-- a los usuarios que se registran o se inscriben en cursos/carreras después
-- de que el aviso fue creado.

-- 1. Trigger para NUEVOS USUARIOS (Alcance: 'all')
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_announcements()
RETURNS TRIGGER AS $$
BEGIN
    -- Asignar todos los avisos activos con scope='all' al nuevo usuario
    INSERT INTO public.announcement_recipients (announcement_id, recipient_id, sent_at, received_at)
    SELECT id, NEW.id, now(), now()
    FROM public.announcements
    WHERE scope = 'all'
      AND is_active = true
      AND (expires_at IS NULL OR expires_at >= now())
    ON CONFLICT (announcement_id, recipient_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_user_announcements ON public.users;
CREATE TRIGGER trigger_new_user_announcements
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_announcements();

-- 2. Trigger para NUEVAS INSCRIPCIONES A CURSOS (Alcance: 'course')
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_course_enrollment_announcements()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si la inscripción está activa (nuevo insert o update a active)
    IF NEW.status = 'active' THEN
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id, sent_at, received_at)
        SELECT id, NEW.student_id, now(), now()
        FROM public.announcements
        WHERE scope = 'course'
          AND target_course_id = NEW.course_id
          AND is_active = true
          AND (expires_at IS NULL OR expires_at >= now())
        ON CONFLICT (announcement_id, recipient_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_course_enrollment_announcements ON public.course_enrollments;
CREATE TRIGGER trigger_new_course_enrollment_announcements
    AFTER INSERT OR UPDATE ON public.course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_course_enrollment_announcements();

-- 3. Trigger para NUEVAS INSCRIPCIONES A CARRERAS (Alcance: 'career')
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_career_enrollment_announcements()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si la inscripción está activa
    IF NEW.status = 'active' THEN
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id, sent_at, received_at)
        SELECT id, NEW.student_id, now(), now()
        FROM public.announcements
        WHERE scope = 'career'
          AND target_career_id = NEW.career_id
          AND is_active = true
          AND (expires_at IS NULL OR expires_at >= now())
        ON CONFLICT (announcement_id, recipient_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_career_enrollment_announcements ON public.career_enrollments;
CREATE TRIGGER trigger_new_career_enrollment_announcements
    AFTER INSERT OR UPDATE ON public.career_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_career_enrollment_announcements();
