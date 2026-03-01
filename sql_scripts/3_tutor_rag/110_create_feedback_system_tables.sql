-- =====================================================
-- SISTEMA DE RETROALIMENTACIÓN PARA TUTOR AI
-- Almacena respuestas de conocimiento general para convertirlas en RAG
-- =====================================================

-- Tabla para almacenar preguntas respondidas por conocimiento general
CREATE TABLE IF NOT EXISTS tutor_general_knowledge_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    tokens_used INTEGER,
    cost NUMERIC(10, 8),
    model TEXT,
    rag_confidence NUMERIC(3, 2), -- Confianza original de RAG (si fue baja)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'rejected', 'deprecated')),
    quality_score NUMERIC(3, 2), -- Calificación de calidad (0-1), calculada durante procesamiento
    usage_count INTEGER DEFAULT 0, -- Veces que se ha usado como RAG (para tracking)
    metadata JSONB DEFAULT '{}', -- Metadata adicional
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_by_interaction_id UUID REFERENCES tutor_interactions(id) ON DELETE SET NULL
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_tutor_gkr_course_status ON tutor_general_knowledge_responses(course_id, status);
CREATE INDEX IF NOT EXISTS idx_tutor_gkr_status ON tutor_general_knowledge_responses(status);
CREATE INDEX IF NOT EXISTS idx_tutor_gkr_created ON tutor_general_knowledge_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_tutor_gkr_interaction ON tutor_general_knowledge_responses(created_by_interaction_id);

-- Comentarios en las columnas
COMMENT ON TABLE tutor_general_knowledge_responses IS 'Almacena respuestas generadas con conocimiento general de Gemini para convertirlas posteriormente en chunks RAG';
COMMENT ON COLUMN tutor_general_knowledge_responses.status IS 'Estado: pending (pendiente), processing (procesando), processed (procesado), rejected (rechazado), deprecated (obsoleto)';
COMMENT ON COLUMN tutor_general_knowledge_responses.quality_score IS 'Calificación de calidad (0-1) calculada durante el procesamiento';
COMMENT ON COLUMN tutor_general_knowledge_responses.usage_count IS 'Número de veces que este contenido ha sido usado como RAG después de ser procesado';

-- =====================================================
-- FUNCIÓN PARA OBTENER RESPUESTAS PENDIENTES
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_feedback_responses(
    p_course_id INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    course_id INTEGER,
    question TEXT,
    answer TEXT,
    rag_confidence NUMERIC,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tkr.id,
        tkr.course_id,
        tkr.question,
        tkr.answer,
        tkr.rag_confidence,
        tkr.created_at
    FROM tutor_general_knowledge_responses tkr
    WHERE tkr.status = 'pending'
      AND (p_course_id IS NULL OR tkr.course_id = p_course_id)
    ORDER BY tkr.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN PARA MARCAR RESPUESTAS COMO PROCESADAS
-- =====================================================

CREATE OR REPLACE FUNCTION mark_feedback_responses_processed(
    p_response_ids UUID[],
    p_quality_scores NUMERIC[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Actualizar estado a 'processed'
    UPDATE tutor_general_knowledge_responses
    SET 
        status = 'processed',
        processed_at = CURRENT_TIMESTAMP,
        quality_score = CASE 
            WHEN p_quality_scores IS NOT NULL AND array_length(p_quality_scores, 1) > 0 
            THEN p_quality_scores[array_position(p_response_ids, id)]
            ELSE quality_score
        END
    WHERE id = ANY(p_response_ids);
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE tutor_general_knowledge_responses ENABLE ROW LEVEL SECURITY;

-- Política: Los estudiantes pueden ver sus propias respuestas
CREATE POLICY "Students can view their own feedback responses"
    ON tutor_general_knowledge_responses
    FOR SELECT
    USING (
        auth.uid() = student_id
        OR EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'coordinator', 'admin-campus', 'supervisor', 'teacher')
            )
        )
    );

-- Política: Solo el sistema puede insertar (a través de funciones)
CREATE POLICY "System can insert feedback responses"
    ON tutor_general_knowledge_responses
    FOR INSERT
    WITH CHECK (true); -- Permitir inserción desde servicios

-- Política: Solo admins/profesores pueden actualizar
CREATE POLICY "Admins and teachers can update feedback responses"
    ON tutor_general_knowledge_responses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role_id IN (
                SELECT id FROM roles WHERE name IN ('admin', 'coordinator', 'admin-campus', 'supervisor', 'teacher')
            )
        )
    );

-- =====================================================
-- VISTA PARA ESTADÍSTICAS
-- =====================================================

CREATE OR REPLACE VIEW feedback_responses_stats AS
SELECT 
    course_id,
    status,
    COUNT(*) as count,
    AVG(quality_score) as avg_quality_score,
    SUM(CASE WHEN status = 'processed' THEN usage_count ELSE 0 END) as total_usage_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM tutor_general_knowledge_responses
GROUP BY course_id, status;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Dar permisos a usuarios autenticados
GRANT SELECT, INSERT ON tutor_general_knowledge_responses TO authenticated;
GRANT SELECT ON feedback_responses_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_feedback_responses TO authenticated;
GRANT EXECUTE ON FUNCTION mark_feedback_responses_processed TO authenticated;
