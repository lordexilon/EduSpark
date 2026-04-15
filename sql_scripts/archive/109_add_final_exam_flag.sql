-- 109_add_final_exam_flag.sql
-- Agregar campo para marcar exámenes como finales

-- Agregar columna is_final_exam a la tabla assessments
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS is_final_exam BOOLEAN DEFAULT false;

-- Crear índice para búsquedas rápidas de exámenes finales
CREATE INDEX IF NOT EXISTS idx_assessments_final_exam 
ON public.assessments(course_id, is_final_exam) 
WHERE is_final_exam = true;

-- Comentario
COMMENT ON COLUMN public.assessments.is_final_exam IS 
'Indica si este assessment es un examen final del curso. Los exámenes finales se muestran antes de "Materiales del Curso" en la vista del estudiante.';

