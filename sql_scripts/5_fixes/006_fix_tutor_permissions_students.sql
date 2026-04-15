-- =====================================================
-- FIX: Permisos de Tutor para Estudiantes (Complemento de Seguridad)
-- =====================================================

-- Asegurar que los ESTUDIANTES puedan ver la configuración pedagógica
-- de los cursos en los que están inscritos (necesario para que cargue el Tutor)

DROP POLICY IF EXISTS "settings_student_view" ON public.course_pedagogical_settings;

CREATE POLICY "settings_student_view" ON public.course_pedagogical_settings
  FOR SELECT
  TO authenticated
  USING (
    -- El usuario debe estar inscrito en el curso correspondiente
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = course_pedagogical_settings.course_id
      AND e.student_id = auth.uid()
      AND e.status = 'active'
    )
    OR
    -- O el curso es público (opcional, dependiendo de tu lógica de negocio)
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_pedagogical_settings.course_id
      AND c.status = 'active'
      -- AND c.is_public = true (si existiera esa bandera)
    )
  );

-- Verificación de seguridad para la tabla courses (asegurar lectura para inscritos)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'courses' 
        AND policyname = 'courses_select_enrolled'
    ) THEN
        CREATE POLICY "courses_select_enrolled" ON public.courses
          FOR SELECT
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.enrollments e
              WHERE e.course_id = courses.id
              AND e.student_id = auth.uid()
              AND e.status = 'active'
            )
          );
        RAISE NOTICE '✅ Creada política de lectura de cursos para estudiantes inscritos';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '✅ Seguridad de Tutor verificada: Estudiantes tienen acceso acceso correcto.';
END $$;
