-- 92_tutor_analytics_tables_fix_rls.sql
-- Corrección de políticas RLS para incluir coordinadores y corregir nombre de columna

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Teachers can view interactions in their courses" ON tutor_interactions;
DROP POLICY IF EXISTS "Admins can view all tutor interactions" ON tutor_interactions;
DROP POLICY IF EXISTS "Teachers can view performance metrics in their courses" ON student_tutor_performance;
DROP POLICY IF EXISTS "Admins can view all performance metrics" ON student_tutor_performance;
DROP POLICY IF EXISTS "Teachers can view limits in their courses" ON tutor_usage_limits;
DROP POLICY IF EXISTS "Admins can manage all limits" ON tutor_usage_limits;

-- Función helper para verificar si es coordinador
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'coordinator'
  );
$$;

-- Función helper para verificar si es admin o coordinador
CREATE OR REPLACE FUNCTION public.is_admin_or_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  );
$$;

-- Políticas RLS para tutor_interactions
-- Docentes pueden ver interacciones de sus cursos (usando teacher_id, no instructor_id)
CREATE POLICY "Teachers can view interactions in their courses"
    ON tutor_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = tutor_interactions.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Administradores y coordinadores pueden ver todas las interacciones
CREATE POLICY "Admins and coordinators can view all tutor interactions"
    ON tutor_interactions FOR SELECT
    USING (public.is_admin_or_coordinator());

-- Políticas RLS para student_tutor_performance
-- Docentes pueden ver métricas de sus cursos
CREATE POLICY "Teachers can view performance metrics in their courses"
    ON student_tutor_performance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = student_tutor_performance.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Administradores y coordinadores pueden ver todas las métricas
CREATE POLICY "Admins and coordinators can view all performance metrics"
    ON student_tutor_performance FOR SELECT
    USING (public.is_admin_or_coordinator());

-- Políticas RLS para tutor_usage_limits
-- Docentes pueden ver límites de sus cursos
CREATE POLICY "Teachers can view limits in their courses"
    ON tutor_usage_limits FOR SELECT
    USING (
        course_id IS NULL OR EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = tutor_usage_limits.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Administradores y coordinadores pueden gestionar todos los límites
CREATE POLICY "Admins and coordinators can manage all limits"
    ON tutor_usage_limits FOR ALL
    USING (public.is_admin_or_coordinator());

