-- =====================================================
-- Sistema de Tablero de Avisos (Announcements)
-- =====================================================
-- Permite enviar avisos a todos los usuarios o grupos específicos
-- Incluye tracking de recepción y lectura
-- =====================================================

-- Tabla principal de avisos
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Alcance del aviso
    scope VARCHAR(50) NOT NULL DEFAULT 'all', -- 'all', 'course', 'career', 'role'
    target_course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
    target_career_id INTEGER REFERENCES public.careers(id) ON DELETE CASCADE,
    target_role_id INTEGER REFERENCES public.roles(id) ON DELETE SET NULL,
    
    -- Prioridad y visibilidad
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Fechas
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Adjuntos y metadatos
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de destinatarios (para tracking detallado)
CREATE TABLE IF NOT EXISTS public.announcement_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Estado de recepción
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Tracking adicional
    notification_sent BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    
    UNIQUE(announcement_id, recipient_id)
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_announcements_author ON public.announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_announcements_scope ON public.announcements(scope);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON public.announcements(target_course_id) WHERE target_course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_career ON public.announcements(target_career_id) WHERE target_career_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_role ON public.announcements(target_role_id) WHERE target_role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, published_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(is_pinned, created_at) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON public.announcements(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_announcement ON public.announcement_recipients(announcement_id);
CREATE INDEX IF NOT EXISTS idx_recipients_user ON public.announcement_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_recipients_read ON public.announcement_recipients(announcement_id, read_at) WHERE read_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_unread ON public.announcement_recipients(recipient_id, read_at) WHERE read_at IS NULL;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();

-- Función para crear destinatarios automáticamente según el alcance
CREATE OR REPLACE FUNCTION create_announcement_recipients(announcement_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    announcement_scope VARCHAR(50);
    announcement_course_id INTEGER;
    announcement_career_id INTEGER;
    announcement_role_id INTEGER;
    recipient_count INTEGER := 0;
BEGIN
    -- Obtener el aviso
    SELECT scope, target_course_id, target_career_id, target_role_id
    INTO announcement_scope, announcement_course_id, announcement_career_id, announcement_role_id
    FROM public.announcements
    WHERE id = announcement_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Announcement not found: %', announcement_uuid;
    END IF;
    
    -- Crear destinatarios según el alcance
    IF announcement_scope = 'all' THEN
        -- Todos los usuarios activos
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id, sent_at, received_at)
        SELECT announcement_uuid, id, now(), now()
        FROM public.users
        WHERE is_active = true
        ON CONFLICT (announcement_id, recipient_id) DO NOTHING;
        
        GET DIAGNOSTICS recipient_count = ROW_COUNT;
        
    ELSIF announcement_scope = 'course' AND announcement_course_id IS NOT NULL THEN
        -- Estudiantes inscritos en el curso
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id, sent_at, received_at)
        SELECT announcement_uuid, student_id, now(), now()
        FROM public.course_enrollments
        WHERE course_id = announcement_course_id
          AND status = 'active'
        ON CONFLICT (announcement_id, recipient_id) DO NOTHING;
        
        GET DIAGNOSTICS recipient_count = ROW_COUNT;
        
    ELSIF announcement_scope = 'career' AND announcement_career_id IS NOT NULL THEN
        -- Estudiantes inscritos en la carrera
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id, sent_at, received_at)
        SELECT announcement_uuid, student_id, now(), now()
        FROM public.career_enrollments
        WHERE career_id = announcement_career_id
          AND status = 'active'
        ON CONFLICT (announcement_id, recipient_id) DO NOTHING;
        
        GET DIAGNOSTICS recipient_count = ROW_COUNT;
        
    ELSIF announcement_scope = 'role' AND announcement_role_id IS NOT NULL THEN
        -- Usuarios con el rol específico
        INSERT INTO public.announcement_recipients (announcement_id, recipient_id, sent_at, received_at)
        SELECT announcement_uuid, id, now(), now()
        FROM public.users
        WHERE role_id = announcement_role_id
          AND is_active = true
        ON CONFLICT (announcement_id, recipient_id) DO NOTHING;
        
        GET DIAGNOSTICS recipient_count = ROW_COUNT;
    END IF;
    
    RETURN recipient_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar un aviso como leído
CREATE OR REPLACE FUNCTION mark_announcement_read(
    announcement_uuid UUID,
    user_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    recipient_exists BOOLEAN;
BEGIN
    -- Verificar si el destinatario existe
    SELECT EXISTS(
        SELECT 1 FROM public.announcement_recipients
        WHERE announcement_id = announcement_uuid
          AND recipient_id = user_uuid
    ) INTO recipient_exists;
    
    IF NOT recipient_exists THEN
        RAISE EXCEPTION 'User is not a recipient of this announcement';
    END IF;
    
    -- Marcar como leído si no está leído ya
    UPDATE public.announcement_recipients
    SET read_at = now()
    WHERE announcement_id = announcement_uuid
      AND recipient_id = user_uuid
      AND read_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de un aviso
CREATE OR REPLACE FUNCTION get_announcement_stats(announcement_uuid UUID)
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
        COUNT(ar.received_at)::BIGINT as received_count,
        COUNT(ar.read_at)::BIGINT as read_count,
        COUNT(*) FILTER (WHERE ar.read_at IS NULL)::BIGINT as unread_count,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(ar.read_at)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
        END as read_percentage
    FROM public.announcement_recipients ar
    WHERE ar.announcement_id = announcement_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener avisos no leídos de un usuario
CREATE OR REPLACE FUNCTION get_unread_announcements(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    content TEXT,
    author_id UUID,
    scope VARCHAR(50),
    target_course_id INTEGER,
    target_career_id INTEGER,
    target_role_id INTEGER,
    priority VARCHAR(20),
    is_pinned BOOLEAN,
    is_active BOOLEAN,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    attachments JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT a.*
    FROM public.announcements a
    INNER JOIN public.announcement_recipients ar ON a.id = ar.announcement_id
    WHERE ar.recipient_id = user_uuid
      AND a.is_active = true
      AND (a.published_at IS NULL OR a.published_at <= now())
      AND (a.expires_at IS NULL OR a.expires_at >= now())
      AND ar.read_at IS NULL
    ORDER BY a.is_pinned DESC, a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS para announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden ver avisos activos y publicados
CREATE POLICY "Anyone can view active published announcements"
    ON public.announcements FOR SELECT
    USING (
        is_active = true 
        AND (published_at IS NULL OR published_at <= now())
        AND (expires_at IS NULL OR expires_at >= now())
    );

-- Política: Profesores y admins pueden crear avisos
CREATE POLICY "Teachers and admins can create announcements"
    ON public.announcements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND (role_id = 2 OR role_id = 3 OR role_id = 4) -- teacher, admin, coordinator
        )
    );

-- Política: Solo el autor puede editar sus avisos
CREATE POLICY "Authors can update their announcements"
    ON public.announcements FOR UPDATE
    USING (author_id = auth.uid())
    WITH CHECK (author_id = auth.uid());

-- Política: Solo el autor o admins pueden eliminar avisos
CREATE POLICY "Authors and admins can delete announcements"
    ON public.announcements FOR DELETE
    USING (
        author_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role_id = 3 -- admin
        )
    );

-- Política: Usuarios pueden ver sus propios registros de recepción
CREATE POLICY "Users can view their own recipient records"
    ON public.announcement_recipients FOR SELECT
    USING (recipient_id = auth.uid());

-- Política: Sistema puede crear registros de destinatarios (via función)
CREATE POLICY "System can create recipient records"
    ON public.announcement_recipients FOR INSERT
    WITH CHECK (true); -- La función SECURITY DEFINER maneja la seguridad

-- Política: Usuarios pueden actualizar su propio estado de lectura
CREATE POLICY "Users can update their own read status"
    ON public.announcement_recipients FOR UPDATE
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- Comentarios en las tablas
COMMENT ON TABLE public.announcements IS 'Tabla principal de avisos del tablero';
COMMENT ON TABLE public.announcement_recipients IS 'Tabla de destinatarios y tracking de recepción/lectura';
COMMENT ON COLUMN public.announcements.scope IS 'Alcance: all, course, career, role';
COMMENT ON COLUMN public.announcements.priority IS 'Prioridad: low, normal, high, urgent';
COMMENT ON COLUMN public.announcement_recipients.sent_at IS 'Cuándo se envió el aviso';
COMMENT ON COLUMN public.announcement_recipients.received_at IS 'Cuándo el usuario recibió el aviso';
COMMENT ON COLUMN public.announcement_recipients.read_at IS 'Cuándo el usuario leyó el aviso';

