-- =====================================================
-- MIGRACIÓN: Extensión de Ponderaciones - Fase 2
-- =====================================================
-- Descripción: Agrega soporte para Tercer Parcial y Trabajos Prácticos
-- =====================================================

-- 1. Agregar columnas a subject_grading_weights
ALTER TABLE public.subject_grading_weights
ADD COLUMN IF NOT EXISTS practicals_weight DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS exam3_weight DECIMAL(5,2) DEFAULT 0.00;

-- 2. Eliminar constraint antigua y agregar la nueva que incluya los nuevos campos
ALTER TABLE public.subject_grading_weights
DROP CONSTRAINT IF EXISTS weights_sum_check;

ALTER TABLE public.subject_grading_weights
ADD CONSTRAINT weights_sum_check CHECK (
  ABS((quizzes_weight + exam1_weight + exam2_weight + exam3_weight + final_exam_weight + practicals_weight) - 100.00) < 0.01
);

-- 3. Comentarios
COMMENT ON COLUMN public.subject_grading_weights.practicals_weight IS 'Porcentaje para Trabajos Prácticos o Laboratorios';
COMMENT ON COLUMN public.subject_grading_weights.exam3_weight IS 'Porcentaje del tercer examen parcial';

-- 4. Notificar
DO $$
BEGIN
    RAISE NOTICE '✅ Extensión de ponderaciones aplicada: practicals_weight y exam3_weight agregados.';
END $$;
