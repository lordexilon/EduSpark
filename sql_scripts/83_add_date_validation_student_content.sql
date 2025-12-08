-- =====================================================
-- Script: Validación de fechas para contenido de estudiantes
-- Descripción: Restringe el acceso al contenido (sessions, materials, units)
--              para estudiantes basado en fechas. Los roles admin, teacher,
--              coordinator, supervisor y admin_campus pueden ver todo sin restricciones.
-- Fecha: 2025-01-XX
-- =====================================================

-- =====================================================
-- PASO 1: Crear función helper para verificar si es estudiante
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'student'
  );
$$;

-- =====================================================
-- PASO 2: Función helper para verificar si el contenido está disponible por fechas
-- =====================================================

-- Función para verificar si una sesión está disponible según fechas
CREATE OR REPLACE FUNCTION public.is_session_available_by_dates(
  p_session_starts_at timestamptz,
  p_session_ends_at timestamptz,
  p_course_id integer
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    -- Si la sesión tiene fechas, validar contra ellas
    WHEN p_session_starts_at IS NOT NULL AND p_session_ends_at IS NOT NULL THEN
      NOW() >= p_session_starts_at AND NOW() <= p_session_ends_at
    -- Si la sesión no tiene fechas, validar contra las fechas del curso
    WHEN p_session_starts_at IS NULL OR p_session_ends_at IS NULL THEN
      EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = p_course_id
          AND c.start_date IS NOT NULL
          AND c.end_date IS NOT NULL
          -- Comparar fechas: usar CURRENT_DATE para comparar solo la fecha (sin hora)
          -- Esto evita problemas de zona horaria. start_date y end_date pueden ser text o date
          AND CURRENT_DATE >= (c.start_date::text)::date
          AND CURRENT_DATE <= (c.end_date::text)::date
      )
    -- Si no hay fechas en sesión ni curso, permitir acceso (comportamiento por defecto)
    ELSE TRUE
  END;
$$;

-- =====================================================
-- PASO 3: Actualizar política RLS para SESSIONS (estudiantes con validación de fechas)
-- =====================================================

DROP POLICY IF EXISTS "students_can_view_enrolled_course_sessions" ON public.sessions;

CREATE POLICY "students_can_view_enrolled_course_sessions"
ON public.sessions
FOR SELECT
USING (
  -- Solo aplicar restricción de fechas si es estudiante
  (
    public.is_student()
    AND EXISTS (
      SELECT 1 
      FROM public.course_enrollments ce
      WHERE ce.course_id = sessions.course_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
    AND public.is_session_available_by_dates(
      sessions.starts_at,
      sessions.ends_at,
      sessions.course_id
    )
  )
  -- Los demás roles (admin, teacher, coordinator, supervisor, admin_campus) 
  -- ya tienen acceso a través de otras políticas existentes
);

-- =====================================================
-- PASO 4: Actualizar política RLS para MATERIALS (estudiantes con validación de fechas)
-- =====================================================

DROP POLICY IF EXISTS "students_can_view_enrolled_course_materials" ON public.materials;

CREATE POLICY "students_can_view_enrolled_course_materials"
ON public.materials
FOR SELECT
USING (
  -- Solo aplicar restricción de fechas si es estudiante
  (
    public.is_student()
    AND EXISTS (
      SELECT 1 
      FROM public.course_enrollments ce
      WHERE ce.course_id = materials.course_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
    AND (
      -- Si el material está asociado a una sesión, validar fechas de la sesión
      (
        materials.session_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.sessions s
          WHERE s.id = materials.session_id
            AND public.is_session_available_by_dates(
              s.starts_at,
              s.ends_at,
              s.course_id
            )
        )
      )
      OR
      -- Si el material está asociado a una unidad pero no a sesión, validar fechas del curso
      (
        materials.session_id IS NULL
        AND materials.unit_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.courses c
          WHERE c.id = materials.course_id
            AND c.start_date IS NOT NULL
            AND c.end_date IS NOT NULL
            AND CURRENT_DATE >= (c.start_date::text)::date
            AND CURRENT_DATE <= (c.end_date::text)::date
        )
      )
      OR
      -- Si el material solo está asociado al curso (sin unidad ni sesión), validar fechas del curso
      (
        materials.session_id IS NULL
        AND materials.unit_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.courses c
          WHERE c.id = materials.course_id
            AND c.start_date IS NOT NULL
            AND c.end_date IS NOT NULL
            AND CURRENT_DATE >= (c.start_date::text)::date
            AND CURRENT_DATE <= (c.end_date::text)::date
        )
      )
      OR
      -- Si no hay fechas definidas, permitir acceso (comportamiento por defecto)
      (
        materials.session_id IS NULL
        AND materials.unit_id IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.courses c
          WHERE c.id = materials.course_id
            AND (c.start_date IS NOT NULL OR c.end_date IS NOT NULL)
        )
      )
    )
  )
  -- Los demás roles ya tienen acceso a través de otras políticas existentes
);

-- =====================================================
-- PASO 5: Actualizar política RLS para COURSE_UNITS (estudiantes con validación de fechas)
-- =====================================================

DROP POLICY IF EXISTS "students_can_view_enrolled_course_units" ON public.course_units;

CREATE POLICY "students_can_view_enrolled_course_units"
ON public.course_units
FOR SELECT
USING (
  -- Solo aplicar restricción de fechas si es estudiante
  (
    public.is_student()
    AND EXISTS (
      SELECT 1 
      FROM public.course_enrollments ce
      WHERE ce.course_id = course_units.course_id
        AND ce.student_id = auth.uid()
        AND ce.status = 'active'
    )
    AND (
      -- Validar contra fechas del curso (las unidades no tienen fechas propias)
      EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_units.course_id
          AND c.start_date IS NOT NULL
          AND c.end_date IS NOT NULL
          -- Comparar fechas: usar CURRENT_DATE para comparar solo la fecha (sin hora)
          -- Esto evita problemas de zona horaria
          AND CURRENT_DATE >= (c.start_date::text)::date
          AND CURRENT_DATE <= (c.end_date::text)::date
      )
      OR
      -- Si no hay fechas definidas en el curso, permitir acceso (comportamiento por defecto)
      NOT EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = course_units.course_id
          AND (c.start_date IS NOT NULL OR c.end_date IS NOT NULL)
      )
    )
  )
  -- Los demás roles ya tienen acceso a través de otras políticas existentes
);

-- =====================================================
-- PASO 6: Verificación y resumen
-- =====================================================

-- Verificar políticas creadas
SELECT 
  'sessions' as tabla,
  policyname,
  cmd,
  qual as condicion
FROM pg_policies
WHERE tablename = 'sessions'
  AND schemaname = 'public'
  AND policyname = 'students_can_view_enrolled_course_sessions'
ORDER BY policyname;

SELECT 
  'materials' as tabla,
  policyname,
  cmd,
  qual as condicion
FROM pg_policies
WHERE tablename = 'materials'
  AND schemaname = 'public'
  AND policyname = 'students_can_view_enrolled_course_materials'
ORDER BY policyname;

SELECT 
  'course_units' as tabla,
  policyname,
  cmd,
  qual as condicion
FROM pg_policies
WHERE tablename = 'course_units'
  AND schemaname = 'public'
  AND policyname = 'students_can_view_enrolled_course_units'
ORDER BY policyname;

-- Resumen final
SELECT 
  '✅ Políticas RLS con validación de fechas implementadas' as resultado,
  COUNT(*) FILTER (WHERE tablename = 'sessions' AND policyname LIKE '%student%') as sessions_policies,
  COUNT(*) FILTER (WHERE tablename = 'materials' AND policyname LIKE '%student%') as materials_policies,
  COUNT(*) FILTER (WHERE tablename = 'course_units' AND policyname LIKE '%student%') as units_policies
FROM pg_policies
WHERE tablename IN ('sessions', 'materials', 'course_units')
  AND schemaname = 'public'
  AND policyname LIKE '%student%';

