-- 100_setup_forums.sql
-- Tablas y políticas para foros de discusión

-- Crear tabla de temas del foro
CREATE TABLE IF NOT EXISTS public.forum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reply_count INTEGER NOT NULL DEFAULT 0,
    last_message_excerpt TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION public.update_forum_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_forum_topics_updated_at ON public.forum_topics;
CREATE TRIGGER trigger_forum_topics_updated_at
    BEFORE UPDATE ON public.forum_topics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_forum_topics_updated_at();

-- Habilitar RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS forum_topics_read ON public.forum_topics;
CREATE POLICY forum_topics_read
    ON public.forum_topics
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS forum_topics_manage ON public.forum_topics;
CREATE POLICY forum_topics_manage
    ON public.forum_topics
    FOR ALL
    USING (
        public.is_admin()
        OR public.is_teacher_admin_or_coordinator()
        OR (created_by = auth.uid())
    )
    WITH CHECK (
        public.is_admin()
        OR public.is_teacher_admin_or_coordinator()
        OR (created_by = auth.uid())
    );

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_forum_topics_course ON public.forum_topics(course_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created_by ON public.forum_topics(created_by);
CREATE INDEX IF NOT EXISTS idx_forum_topics_last_message ON public.forum_topics(last_message_at DESC);

-- Tabla de respuestas
CREATE TABLE IF NOT EXISTS public.forum_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at para replies
CREATE OR REPLACE FUNCTION public.update_forum_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_forum_replies_updated_at ON public.forum_replies;
CREATE TRIGGER trigger_forum_replies_updated_at
    BEFORE UPDATE ON public.forum_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_forum_replies_updated_at();

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_replies_read ON public.forum_replies;
CREATE POLICY forum_replies_read
    ON public.forum_replies
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS forum_replies_manage ON public.forum_replies;
CREATE POLICY forum_replies_manage
    ON public.forum_replies
    FOR ALL
    USING (
        public.is_admin()
        OR public.is_teacher_admin_or_coordinator()
        OR (author_id = auth.uid())
    )
    WITH CHECK (
        public.is_admin()
        OR public.is_teacher_admin_or_coordinator()
        OR (author_id = auth.uid())
    );

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON public.forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON public.forum_replies(author_id);

-- Función para actualizar métricas de foro al agregar respuesta
CREATE OR REPLACE FUNCTION public.increment_forum_topic_replies(
    p_topic_id UUID,
    p_last_excerpt TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE public.forum_topics
    SET
        reply_count = COALESCE(reply_count, 0) + 1,
        last_message_excerpt = COALESCE(p_last_excerpt, last_message_excerpt),
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = p_topic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.refresh_forum_topic_metrics(UUID);
CREATE OR REPLACE FUNCTION public.refresh_forum_topic_metrics(
    p_topic_id UUID
)
RETURNS void AS $$
DECLARE
    reply_count_value INTEGER := 0;
    latest_content TEXT;
    latest_created_at TIMESTAMPTZ;
BEGIN
    SELECT COUNT(*)
    INTO reply_count_value
    FROM public.forum_replies
    WHERE topic_id = p_topic_id;

    SELECT fr.content, fr.created_at
    INTO latest_content, latest_created_at
    FROM public.forum_replies fr
    WHERE fr.topic_id = p_topic_id
    ORDER BY fr.created_at DESC
    LIMIT 1;

    UPDATE public.forum_topics
    SET
        reply_count = reply_count_value,
        last_message_excerpt = CASE
            WHEN reply_count_value > 0 AND latest_content IS NOT NULL THEN
                CASE
                    WHEN length(latest_content) > 160 THEN substr(latest_content, 1, 157) || '…'
                    ELSE latest_content
                END
            ELSE NULL
        END,
        last_message_at = CASE
            WHEN reply_count_value > 0 THEN latest_created_at
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = p_topic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

