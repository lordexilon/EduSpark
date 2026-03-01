-- =====================================================
-- VISTA: Análisis de Evaluaciones Negativas del Tutor
-- Crea una vista para facilitar el análisis de evaluaciones negativas (thumbs down)
-- =====================================================

-- Crear vista para análisis de evaluaciones negativas
CREATE OR REPLACE VIEW negative_ratings_analysis AS
SELECT 
  tmr.id,
  tmr.message_id,
  tmr.student_id,
  tmr.created_at as rating_date,
  tm.content as tutor_response,
  tm.role as message_role,
  tm.conversation_id,
  tc.course_id,
  tc.student_id as conversation_student_id,
  tm.created_at as message_created_at
FROM tutor_message_ratings tmr
JOIN tutor_messages tm ON tmr.message_id = tm.id
JOIN tutor_conversations tc ON tm.conversation_id = tc.id
WHERE tmr.rating = false
ORDER BY tmr.created_at DESC;

COMMENT ON VIEW negative_ratings_analysis IS 'Vista para análisis de evaluaciones negativas del tutor. Incluye información del mensaje, estudiante y curso para facilitar el análisis de qué respuestas no fueron útiles.';

-- Verificar que la vista se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'negative_ratings_analysis'
  ) THEN
    RAISE NOTICE '✅ Vista negative_ratings_analysis creada exitosamente.';
  ELSE
    RAISE EXCEPTION '❌ Error: La vista negative_ratings_analysis no se creó correctamente.';
  END IF;
END $$;
