-- =====================================================
-- Script 06: RLS Policies para Tutor Virtual
-- Políticas de seguridad para el sistema multi-agente
-- =====================================================

-- Conversaciones: solo el estudiante puede ver las suyas
ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own conversations"
    ON tutor_conversations FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "Students can create own conversations"
    ON tutor_conversations FOR INSERT
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own conversations"
    ON tutor_conversations FOR UPDATE
    USING (auth.uid() = student_id);

-- Mensajes: solo el dueño de la conversación
ALTER TABLE tutor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own messages"
    ON tutor_messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM tutor_conversations WHERE student_id = auth.uid()
        )
    );

CREATE POLICY "Students can create messages in own conversations"
    ON tutor_messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM tutor_conversations WHERE student_id = auth.uid()
        )
    );

-- Configuración pedagógica: docentes y estudiantes del curso
ALTER TABLE course_pedagogical_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage course settings"
    ON course_pedagogical_settings FOR ALL
    USING (teacher_id = auth.uid());

CREATE POLICY "Students can view course settings"
    ON course_pedagogical_settings FOR SELECT
    USING (
        course_id IN (
            SELECT course_id FROM course_enrollments WHERE student_id = auth.uid()
        )
    );

-- Escalas de calificación: docentes y estudiantes del curso
ALTER TABLE course_grading_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage grading scales"
    ON course_grading_scales FOR ALL
    USING (teacher_id = auth.uid());

CREATE POLICY "Students can view grading scales"
    ON course_grading_scales FOR SELECT
    USING (
        course_id IN (
            SELECT course_id FROM course_enrollments WHERE student_id = auth.uid()
        )
    );

-- Perfiles de aprendizaje: solo el estudiante
ALTER TABLE student_learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own profile"
    ON student_learning_profiles FOR ALL
    USING (student_id = auth.uid());

-- Imágenes de cursos: docentes del curso y estudiantes inscritos
ALTER TABLE course_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage course images"
    ON course_images FOR ALL
    USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view course images"
    ON course_images FOR SELECT
    USING (
        course_id IN (
            SELECT course_id FROM course_enrollments WHERE student_id = auth.uid()
        )
    );

-- Materiales del curso: docentes y estudiantes del curso
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage course materials"
    ON course_materials FOR ALL
    USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Students can view course materials"
    ON course_materials FOR SELECT
    USING (
        course_id IN (
            SELECT course_id FROM course_enrollments WHERE student_id = auth.uid()
        )
    );

-- Métricas de uso: solo el estudiante y docentes del curso
ALTER TABLE tutor_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own metrics"
    ON tutor_usage_metrics FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Teachers can view course metrics"
    ON tutor_usage_metrics FOR SELECT
    USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "System can insert metrics"
    ON tutor_usage_metrics FOR INSERT
    WITH CHECK (true); -- El sistema puede insertar métricas

-- Configuraciones de agentes: solo docentes del curso
ALTER TABLE agent_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage agent configurations"
    ON agent_configurations FOR ALL
    USING (
        course_id IN (
            SELECT id FROM courses WHERE teacher_id = auth.uid()
        )
    );

-- Políticas adicionales para materiales con imágenes
-- (Si la tabla materials ya tiene RLS, estas políticas se agregan)
DO $$
BEGIN
    -- Verificar si la tabla materials tiene RLS habilitado
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'materials' 
        AND relrowsecurity = true
    ) THEN
        -- Agregar política para actualizar imágenes en materiales
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'materials' 
            AND policyname = 'Teachers can update material images'
        ) THEN
            EXECUTE '
                CREATE POLICY "Teachers can update material images"
                    ON materials FOR UPDATE
                    USING (
                        course_id IN (
                            SELECT id FROM courses WHERE teacher_id = auth.uid()
                        )
                    )';
        END IF;
    END IF;
END $$;

-- Comentarios para documentación
COMMENT ON POLICY "Students can view own conversations" ON tutor_conversations 
    IS 'Los estudiantes solo pueden ver sus propias conversaciones con el tutor';

COMMENT ON POLICY "Teachers can manage course settings" ON course_pedagogical_settings 
    IS 'Los docentes pueden gestionar la configuración pedagógica de sus cursos';

COMMENT ON POLICY "Students can manage own profile" ON student_learning_profiles 
    IS 'Los estudiantes pueden gestionar su propio perfil de aprendizaje';

COMMENT ON POLICY "Teachers can manage course materials" ON course_materials 
    IS 'Los docentes pueden gestionar los materiales de sus cursos';

COMMENT ON POLICY "Students can view course materials" ON course_materials 
    IS 'Los estudiantes pueden ver los materiales de los cursos en los que están inscritos';

COMMENT ON POLICY "Students can view own metrics" ON tutor_usage_metrics 
    IS 'Los estudiantes pueden ver sus propias métricas de uso del tutor';

COMMENT ON POLICY "Teachers can view course metrics" ON tutor_usage_metrics 
    IS 'Los docentes pueden ver las métricas de uso del tutor en sus cursos';

COMMENT ON POLICY "Teachers can manage agent configurations" ON agent_configurations 
    IS 'Los docentes pueden configurar los agentes del sistema multi-agente para sus cursos';
