-- 82_add_student_content_rls.sql
-- Agregar políticas RLS para que estudiantes puedan ver contenido (units, sessions, materials) de cursos en los que están inscritos

-- =====================================================
-- POLÍTICA RLS PARA ESTUDIANTES EN COURSE_UNITS
-- =====================================================

DROP POLICY IF EXISTS "students_can_view_enrolled_course_units" ON public.course_units;

CREATE POLICY "students_can_view_enrolled_course_units"
ON public.course_units
FOR SELECT
USING (
  -- El estudiante está inscrito en el curso (status active)
  EXISTS (
    SELECT 1 
    FROM public.course_enrollments ce
    WHERE ce.course_id = course_units.course_id
      AND ce.student_id = auth.uid()
      AND ce.status = 'active'
  )
);

-- =====================================================
-- POLÍTICA RLS PARA ESTUDIANTES EN SESSIONS
-- =====================================================

DROP POLICY IF EXISTS "students_can_view_enrolled_course_sessions" ON public.sessions;

CREATE POLICY "students_can_view_enrolled_course_sessions"
ON public.sessions
FOR SELECT
USING (
  -- El estudiante está inscrito en el curso (status active)
  EXISTS (
    SELECT 1 
    FROM public.course_enrollments ce
    WHERE ce.course_id = sessions.course_id
      AND ce.student_id = auth.uid()
      AND ce.status = 'active'
  )
);

-- =====================================================
-- POLÍTICA RLS PARA ESTUDIANTES EN MATERIALS
-- =====================================================

DROP POLICY IF EXISTS "students_can_view_enrolled_course_materials" ON public.materials;

CREATE POLICY "students_can_view_enrolled_course_materials"
ON public.materials
FOR SELECT
USING (
  -- El estudiante está inscrito en el curso (status active)
  EXISTS (
    SELECT 1 
    FROM public.course_enrollments ce
    WHERE ce.course_id = materials.course_id
      AND ce.student_id = auth.uid()
      AND ce.status = 'active'
  )
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver todas las políticas de course_units
SELECT 
  'course_units' as tabla,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'ALL' THEN 'ALL'
    ELSE cmd
  END as operacion
FROM pg_policies
WHERE tablename = 'course_units'
  AND schemaname = 'public'
ORDER BY policyname;

-- Ver todas las políticas de sessions
SELECT 
  'sessions' as tabla,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'ALL' THEN 'ALL'
    ELSE cmd
  END as operacion
FROM pg_policies
WHERE tablename = 'sessions'
  AND schemaname = 'public'
ORDER BY policyname;

-- Ver todas las políticas de materials
SELECT 
  'materials' as tabla,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'ALL' THEN 'ALL'
    ELSE cmd
  END as operacion
FROM pg_policies
WHERE tablename = 'materials'
  AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- RESUMEN
-- =====================================================
SELECT 
  '✅ Políticas RLS agregadas exitosamente' as resultado,
  COUNT(*) FILTER (WHERE tablename = 'course_units' AND cmd = 'SELECT') as unidades_read_policies,
  COUNT(*) FILTER (WHERE tablename = 'sessions' AND cmd = 'SELECT') as sessions_read_policies,
  COUNT(*) FILTER (WHERE tablename = 'materials' AND cmd = 'SELECT') as materials_read_policies
FROM pg_policies
WHERE tablename IN ('course_units', 'sessions', 'materials')
  AND schemaname = 'public'
  AND cmd = 'SELECT';

