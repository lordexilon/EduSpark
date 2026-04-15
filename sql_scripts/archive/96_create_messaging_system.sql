-- =====================================================
-- Sistema de Mensajería Simple - EduSpark
-- Permite comunicación entre estudiantes y docentes
-- =====================================================

-- Tabla de conversaciones (chats)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Asegurar que no haya conversaciones duplicadas
    UNIQUE(participant1_id, participant2_id, course_id)
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_course ON conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read, conversation_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = NOW(), 
        last_message_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp cuando se crea un mensaje
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para conversations
-- Los usuarios pueden ver conversaciones donde participan
CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT
    USING (
        participant1_id = auth.uid() OR 
        participant2_id = auth.uid()
    );

-- Los usuarios pueden crear conversaciones donde participan
CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (
        participant1_id = auth.uid() OR 
        participant2_id = auth.uid()
    );

-- Los usuarios pueden actualizar sus conversaciones
CREATE POLICY "Users can update their conversations"
    ON conversations FOR UPDATE
    USING (
        participant1_id = auth.uid() OR 
        participant2_id = auth.uid()
    );

-- Políticas RLS para messages
-- Los usuarios pueden ver mensajes de sus conversaciones
CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant1_id = auth.uid() 
               OR participant2_id = auth.uid()
        )
    );

-- Los usuarios pueden crear mensajes en sus conversaciones
CREATE POLICY "Users can create messages in their conversations"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant1_id = auth.uid() 
               OR participant2_id = auth.uid()
        )
    );

-- Los usuarios pueden actualizar sus propios mensajes (marcar como leído)
CREATE POLICY "Users can update messages in their conversations"
    ON messages FOR UPDATE
    USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant1_id = auth.uid() 
               OR participant2_id = auth.uid()
        )
    );

-- Función helper para obtener o crear conversación
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_participant1_id UUID,
    p_participant2_id UUID,
    p_course_id INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_participant1 UUID;
    v_participant2 UUID;
BEGIN
    -- Asegurar que participant1_id < participant2_id para evitar duplicados
    IF p_participant1_id < p_participant2_id THEN
        v_participant1 := p_participant1_id;
        v_participant2 := p_participant2_id;
    ELSE
        v_participant1 := p_participant2_id;
        v_participant2 := p_participant1_id;
    END IF;

    -- Buscar conversación existente
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE participant1_id = v_participant1
      AND participant2_id = v_participant2
      AND (p_course_id IS NULL OR course_id = p_course_id)
    LIMIT 1;

    -- Si no existe, crear una nueva
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id, course_id)
        VALUES (v_participant1, v_participant2, p_course_id)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE conversations IS 'Conversaciones entre usuarios (estudiantes y docentes)';
COMMENT ON TABLE messages IS 'Mensajes individuales dentro de las conversaciones';
COMMENT ON FUNCTION get_or_create_conversation IS 'Obtiene o crea una conversación entre dos usuarios';

