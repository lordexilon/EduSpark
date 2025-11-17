-- 106_add_multiple_choice_to_flashcards.sql
-- Agregar soporte para opciones múltiples en flashcards
-- Fecha: Enero 2025

-- =====================================================
-- AGREGAR COLUMNAS PARA OPCIONES MÚLTIPLES
-- =====================================================

-- Agregar columna para almacenar opciones de respuesta (JSON)
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS answer_options JSONB DEFAULT NULL;

-- Agregar columna para indicar la respuesta correcta (índice de la opción)
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS correct_answer_index INTEGER DEFAULT NULL;

-- Agregar columna para indicar si es una flashcard de opción múltiple
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS is_multiple_choice BOOLEAN DEFAULT false;

-- Comentarios
COMMENT ON COLUMN flashcards.answer_options IS 'Array JSON con las opciones de respuesta. Ejemplo: [{"label": "A", "text": "Opción 1"}, {"label": "B", "text": "Opción 2"}]';
COMMENT ON COLUMN flashcards.correct_answer_index IS 'Índice (0-based) de la opción correcta en answer_options';
COMMENT ON COLUMN flashcards.is_multiple_choice IS 'Indica si esta flashcard tiene opciones múltiples en lugar de solo texto';

-- =====================================================
-- EJEMPLO DE ESTRUCTURA JSON PARA answer_options
-- =====================================================
-- [
--   {"label": "A", "text": "Opción 1"},
--   {"label": "B", "text": "Opción 2"},
--   {"label": "C", "text": "Opción 3"},
--   {"label": "D", "text": "Opción 4"}
-- ]

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Columnas agregadas para opciones múltiples en flashcards';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NUEVAS COLUMNAS:';
  RAISE NOTICE '   - answer_options (JSONB): Array de opciones de respuesta';
  RAISE NOTICE '   - correct_answer_index (INTEGER): Índice de la respuesta correcta';
  RAISE NOTICE '   - is_multiple_choice (BOOLEAN): Indica si usa opciones múltiples';
  RAISE NOTICE '';
  RAISE NOTICE '💡 USO:';
  RAISE NOTICE '   - Si is_multiple_choice = true, mostrar opciones en lugar de solo texto';
  RAISE NOTICE '   - El estudiante selecciona una opción y se valida con correct_answer_index';
  RAISE NOTICE '   - Las flashcards tradicionales (solo texto) siguen funcionando igual';
END $$;

