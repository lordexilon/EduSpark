-- =====================================================
-- Script para corregir conversaciones duplicadas
-- =====================================================

-- 1. Función para fusionar conversaciones duplicadas
DO $$
DECLARE
    r RECORD;
    v_keep_id UUID;
    v_merged_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando búsqueda de conversaciones duplicadas...';

    -- Buscar pares de usuarios que tienen más de una conversación
    FOR r IN 
        SELECT participant1_id, participant2_id, COUNT(*) as cnt
        FROM conversations
        GROUP BY participant1_id, participant2_id
        HAVING COUNT(*) > 1
    LOOP
        v_merged_count := v_merged_count + 1;
        RAISE NOTICE 'Procesando duplicados para par: % - %', r.participant1_id, r.participant2_id;
        
        -- Identificar la conversación principal para mantener
        -- Priorizamos:
        -- 1. La que tiene course_id NULL (general) si existe, o cualquiera si no
        -- 2. La que tiene más mensajes
        -- 3. La más reciente
        SELECT id INTO v_keep_id
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.participant1_id = r.participant1_id AND c.participant2_id = r.participant2_id
        GROUP BY c.id
        ORDER BY 
            (c.course_id IS NULL) DESC, -- Preferir chats generales
            COUNT(m.id) DESC,           -- Preferir chats con más mensajes
            c.last_message_at DESC      -- Preferir chats más recientes
        LIMIT 1;
        
        RAISE NOTICE '  -> Manteniendo conversación: %', v_keep_id;
        
        -- Mover mensajes de las otras conversaciones a la principal
        UPDATE messages
        SET conversation_id = v_keep_id
        WHERE conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant1_id = r.participant1_id 
              AND participant2_id = r.participant2_id 
              AND id != v_keep_id
        );
        
        -- Eliminar las conversaciones duplicadas (ya vacías de mensajes)
        DELETE FROM conversations
        WHERE participant1_id = r.participant1_id 
          AND participant2_id = r.participant2_id 
          AND id != v_keep_id;
          
    END LOOP;

    RAISE NOTICE 'Proceso completado. Se fusionaron % grupos de conversaciones duplicadas.', v_merged_count;
END $$;

-- 2. Actualizar la función get_or_create_conversation para evitar futuros duplicados
-- Esta versión ignora el course_id al buscar, devolviendo cualquier conversación existente entre los dos usuarios
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
    -- Asegurar que participant1_id < participant2_id para evitar duplicados por orden
    IF p_participant1_id < p_participant2_id THEN
        v_participant1 := p_participant1_id;
        v_participant2 := p_participant2_id;
    ELSE
        v_participant1 := p_participant2_id;
        v_participant2 := p_participant1_id;
    END IF;

    -- Buscar conversación existente
    -- Priorizamos la que coincida con el course_id solicitado, pero si no, devolvemos cualquiera existente
    -- para evitar crear una nueva.
    SELECT id INTO v_conversation_id
    FROM conversations
    WHERE participant1_id = v_participant1
      AND participant2_id = v_participant2
    ORDER BY 
        CASE WHEN course_id = p_course_id THEN 0 
             WHEN course_id IS NULL THEN 1
             ELSE 2 END,
        last_message_at DESC
    LIMIT 1;

    -- Si no existe ninguna conversación entre estos dos usuarios, crear una nueva
    IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id, course_id)
        VALUES (v_participant1, v_participant2, p_course_id)
        RETURNING id INTO v_conversation_id;
    END IF;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
