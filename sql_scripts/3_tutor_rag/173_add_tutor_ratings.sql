-- =====================================================
-- MIGRACIÓN: Sistema de Calificaciones para Mensajes del Tutor
-- Agrega tabla para almacenar ratings (pulgares arriba/abajo) de las respuestas
-- =====================================================

-- Opción: Tabla separada (más flexible para futuras expansiones)
-- Permite múltiples estudiantes calificar el mismo mensaje si es compartido
-- Permite agregar más información (comentarios, etc.) en el futuro

CREATE TABLE IF NOT EXISTS tutor_message_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES tutor_messages(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating BOOLEAN NOT NULL, -- true = thumbs up (👍), false = thumbs down (👎)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, student_id)
);

-- Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_tutor_message_ratings_message_id ON tutor_message_ratings(message_id);
CREATE INDEX IF NOT EXISTS idx_tutor_message_ratings_student_id ON tutor_message_ratings(student_id);
CREATE INDEX IF NOT EXISTS idx_tutor_message_ratings_rating ON tutor_message_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_tutor_message_ratings_created_at ON tutor_message_ratings(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_tutor_message_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_tutor_message_ratings_updated_at ON tutor_message_ratings;
CREATE TRIGGER trigger_update_tutor_message_ratings_updated_at
  BEFORE UPDATE ON tutor_message_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_tutor_message_ratings_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE tutor_message_ratings IS 'Almacena las calificaciones (pulgares arriba/abajo) que los estudiantes dan a las respuestas del tutor';
COMMENT ON COLUMN tutor_message_ratings.message_id IS 'ID del mensaje del tutor que se está calificando';
COMMENT ON COLUMN tutor_message_ratings.student_id IS 'ID del estudiante que califica';
COMMENT ON COLUMN tutor_message_ratings.rating IS 'true = pulgar arriba (👍), false = pulgar abajo (👎)';

-- Verificar que la tabla se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tutor_message_ratings'
  ) THEN
    RAISE NOTICE '✅ Tabla tutor_message_ratings creada exitosamente.';
  ELSE
    RAISE EXCEPTION '❌ Error: La tabla tutor_message_ratings no se creó correctamente.';
  END IF;
END $$;

-- Función helper para obtener estadísticas de ratings de un mensaje
CREATE OR REPLACE FUNCTION get_message_rating_stats(p_message_id UUID)
RETURNS TABLE (
  total_ratings BIGINT,
  thumbs_up_count BIGINT,
  thumbs_down_count BIGINT,
  average_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_ratings,
    COUNT(*) FILTER (WHERE rating = true)::BIGINT as thumbs_up_count,
    COUNT(*) FILTER (WHERE rating = false)::BIGINT as thumbs_down_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE rating = true)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as average_rating
  FROM tutor_message_ratings
  WHERE message_id = p_message_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_message_rating_stats IS 'Obtiene estadísticas de calificaciones para un mensaje específico';

