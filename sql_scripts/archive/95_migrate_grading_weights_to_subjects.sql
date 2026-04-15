-- 95_migrate_grading_weights_to_subjects.sql
-- Migración: Cambiar ponderación de evaluaciones de curso a materia
-- La ponderación ahora será por materia (subject) en lugar de por curso

-- Paso 1: Renombrar la tabla existente (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_grading_weights') THEN
    -- Si la tabla existe, renombrarla temporalmente
    ALTER TABLE public.course_grading_weights RENAME TO course_grading_weights_old;
  END IF;
END $$;

-- Paso 2: Crear nueva tabla con subject_id
CREATE TABLE IF NOT EXISTS public.subject_grading_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  
  -- Ponderaciones por tipo de evaluación (en porcentaje)
  quizzes_weight DECIMAL(5,2) DEFAULT 30.00,  -- Quizzes, trivias, tareas
  exam1_weight DECIMAL(5,2) DEFAULT 20.00,    -- Primer examen
  exam2_weight DECIMAL(5,2) DEFAULT 20.00,    -- Segundo examen
  final_exam_weight DECIMAL(5,2) DEFAULT 30.00, -- Examen final
  
  -- Configuración adicional
  allow_custom_weights BOOLEAN DEFAULT true,   -- Permitir modificar ponderaciones
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(subject_id),
  CONSTRAINT weights_sum_check CHECK (
    ABS((quizzes_weight + exam1_weight + exam2_weight + final_exam_weight) - 100.00) < 0.01
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subject_grading_weights_subject_id 
  ON public.subject_grading_weights(subject_id);

-- Comentarios
COMMENT ON TABLE public.subject_grading_weights IS 'Configuración de ponderación de evaluaciones por materia';
COMMENT ON COLUMN public.subject_grading_weights.subject_id IS 'ID de la materia (subject)';
COMMENT ON COLUMN public.subject_grading_weights.quizzes_weight IS 'Porcentaje que representan quizzes, trivias y tareas (30% por defecto)';
COMMENT ON COLUMN public.subject_grading_weights.exam1_weight IS 'Porcentaje del primer examen (20% por defecto)';
COMMENT ON COLUMN public.subject_grading_weights.exam2_weight IS 'Porcentaje del segundo examen (20% por defecto)';
COMMENT ON COLUMN public.subject_grading_weights.final_exam_weight IS 'Porcentaje del examen final (30% por defecto)';

-- Paso 3: Migrar datos existentes (si hay datos en la tabla antigua)
DO $$
DECLARE
  old_record RECORD;
  course_subject_id INTEGER;
BEGIN
  -- Si existe la tabla antigua, migrar los datos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_grading_weights_old') THEN
    FOR old_record IN 
      SELECT * FROM public.course_grading_weights_old
    LOOP
      -- Obtener el subject_id del curso
      SELECT subject_id INTO course_subject_id
      FROM public.courses
      WHERE id = old_record.course_id;
      
      -- Si el curso tiene una materia asociada, migrar la ponderación
      IF course_subject_id IS NOT NULL THEN
        -- Insertar o actualizar la ponderación para la materia
        INSERT INTO public.subject_grading_weights (
          subject_id,
          quizzes_weight,
          exam1_weight,
          exam2_weight,
          final_exam_weight,
          allow_custom_weights,
          created_at,
          updated_at
        )
        VALUES (
          course_subject_id,
          old_record.quizzes_weight,
          old_record.exam1_weight,
          old_record.exam2_weight,
          old_record.final_exam_weight,
          old_record.allow_custom_weights,
          old_record.created_at,
          old_record.updated_at
        )
        ON CONFLICT (subject_id) DO UPDATE SET
          quizzes_weight = EXCLUDED.quizzes_weight,
          exam1_weight = EXCLUDED.exam1_weight,
          exam2_weight = EXCLUDED.exam2_weight,
          final_exam_weight = EXCLUDED.final_exam_weight,
          allow_custom_weights = EXCLUDED.allow_custom_weights,
          updated_at = NOW();
      END IF;
    END LOOP;
    
    -- Eliminar la tabla antigua después de la migración
    DROP TABLE IF EXISTS public.course_grading_weights_old CASCADE;
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.subject_grading_weights ENABLE ROW LEVEL SECURITY;

-- Política: Docentes pueden gestionar ponderaciones de materias de sus cursos
CREATE POLICY "Teachers can manage grading weights for their subjects"
  ON public.subject_grading_weights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.subject_id = subject_grading_weights.subject_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- Política: Coordinadores y admins pueden gestionar todas las ponderaciones
CREATE POLICY "Coordinators and admins can manage all grading weights"
  ON public.subject_grading_weights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role_id IN (
        SELECT id FROM public.roles WHERE name IN ('admin', 'coordinator')
      )
    )
  );

-- Política: Estudiantes pueden ver ponderaciones de materias de sus cursos
CREATE POLICY "Students can view grading weights for their subjects"
  ON public.subject_grading_weights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_enrollments 
      INNER JOIN public.courses ON courses.id = course_enrollments.course_id
      WHERE courses.subject_id = subject_grading_weights.subject_id 
      AND course_enrollments.student_id = auth.uid()
      AND course_enrollments.status = 'active'
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_subject_grading_weights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subject_grading_weights_timestamp
  BEFORE UPDATE ON public.subject_grading_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_subject_grading_weights_updated_at();

