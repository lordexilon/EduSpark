-- 94_course_grading_weights.sql
-- Tabla para configuración de ponderación de evaluaciones por curso
-- Permite a docentes/coordinadores configurar cómo se calcula la nota final

-- Crear tabla para ponderaciones de evaluación
CREATE TABLE IF NOT EXISTS public.course_grading_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  
  -- Ponderaciones por tipo de evaluación (en porcentaje)
  quizzes_weight DECIMAL(5,2) DEFAULT 30.00,  -- Quizzes, trivias, tareas
  exam1_weight DECIMAL(5,2) DEFAULT 20.00,    -- Primer examen
  exam2_weight DECIMAL(5,2) DEFAULT 20.00,    -- Segundo examen
  final_exam_weight DECIMAL(5,2) DEFAULT 30.00, -- Examen final
  
  -- Configuración adicional
  allow_custom_weights BOOLEAN DEFAULT true,   -- Permitir modificar ponderaciones
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id),
  CONSTRAINT weights_sum_check CHECK (
    ABS((quizzes_weight + exam1_weight + exam2_weight + final_exam_weight) - 100.00) < 0.01
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_course_grading_weights_course_id 
  ON public.course_grading_weights(course_id);

-- Comentarios
COMMENT ON TABLE public.course_grading_weights IS 'Configuración de ponderación de evaluaciones por curso';
COMMENT ON COLUMN public.course_grading_weights.quizzes_weight IS 'Porcentaje que representan quizzes, trivias y tareas (30% por defecto)';
COMMENT ON COLUMN public.course_grading_weights.exam1_weight IS 'Porcentaje del primer examen (20% por defecto)';
COMMENT ON COLUMN public.course_grading_weights.exam2_weight IS 'Porcentaje del segundo examen (20% por defecto)';
COMMENT ON COLUMN public.course_grading_weights.final_exam_weight IS 'Porcentaje del examen final (30% por defecto)';

-- Habilitar RLS
ALTER TABLE public.course_grading_weights ENABLE ROW LEVEL SECURITY;

-- Política: Docentes pueden gestionar ponderaciones de sus cursos
CREATE POLICY "Teachers can manage grading weights for their courses"
  ON public.course_grading_weights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_grading_weights.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- Política: Coordinadores y admins pueden gestionar todas las ponderaciones
CREATE POLICY "Coordinators and admins can manage all grading weights"
  ON public.course_grading_weights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role_id IN (
        SELECT id FROM public.roles WHERE name IN ('admin', 'coordinator')
      )
    )
  );

-- Política: Estudiantes pueden ver ponderaciones de sus cursos
CREATE POLICY "Students can view grading weights for their courses"
  ON public.course_grading_weights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments 
      WHERE course_enrollments.course_id = course_grading_weights.course_id 
      AND course_enrollments.student_id = auth.uid()
      AND course_enrollments.status = 'active'
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_course_grading_weights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_grading_weights_timestamp
  BEFORE UPDATE ON public.course_grading_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_course_grading_weights_updated_at();

