-- =====================================================
-- Script: Permitir acceso de supervisor a cursos de su institución
-- Descripción: Permite que supervisores, admin-campus y coordinadores
--              vean todos los cursos activos de su institución
-- =====================================================

-- =====================================================
-- PASO 1: Verificar funciones helper existentes
-- =====================================================

-- Verificar que las funciones helper existen
SELECT 
  'Verificación de funciones helper' as verificacion,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_supervisor', 'is_admin_campus', 'is_coordinator', 'get_user_primary_institution_id')
ORDER BY routine_name;

-- =====================================================
-- PASO 2: Agregar políticas para cursos
-- =====================================================

-- Política para que supervisores vean cursos de su institución
DROP POLICY IF EXISTS "supervisor_view_institution_courses" ON public.courses;

CREATE POLICY "supervisor_view_institution_courses" ON public.courses
  FOR SELECT
  USING (
    public.is_supervisor()
    AND institution_id = public.get_user_primary_institution_id()
    AND status = 'active'
  );

-- Política para que admin-campus y coordinadores vean cursos de su institución
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_courses" ON public.courses;

CREATE POLICY "admin_campus_coordinator_view_institution_courses" ON public.courses
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND institution_id = public.get_user_primary_institution_id()
    AND status = 'active'
  );

-- =====================================================
-- PASO 3: Agregar políticas para course_units
-- =====================================================

-- Política para que supervisores vean unidades de cursos de su institución
DROP POLICY IF EXISTS "supervisor_view_institution_course_units" ON public.course_units;

CREATE POLICY "supervisor_view_institution_course_units" ON public.course_units
  FOR SELECT
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
        AND c.status = 'active'
    )
  );

-- Política para que admin-campus y coordinadores vean unidades de cursos de su institución
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_course_units" ON public.course_units;

CREATE POLICY "admin_campus_coordinator_view_institution_course_units" ON public.course_units
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
        AND c.status = 'active'
    )
  );

-- =====================================================
-- PASO 4: Agregar políticas para sessions
-- =====================================================

-- Política para que supervisores vean sesiones de cursos de su institución
DROP POLICY IF EXISTS "supervisor_view_institution_sessions" ON public.sessions;

CREATE POLICY "supervisor_view_institution_sessions" ON public.sessions
  FOR SELECT
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
        AND c.status = 'active'
    )
  );

-- Política para que admin-campus y coordinadores vean sesiones de cursos de su institución
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_sessions" ON public.sessions;

CREATE POLICY "admin_campus_coordinator_view_institution_sessions" ON public.sessions
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
        AND c.status = 'active'
    )
  );

-- =====================================================
-- PASO 5: Agregar políticas para materials
-- =====================================================

-- Política para que supervisores vean materiales de cursos de su institución
DROP POLICY IF EXISTS "supervisor_view_institution_materials" ON public.materials;

CREATE POLICY "supervisor_view_institution_materials" ON public.materials
  FOR SELECT
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
        AND c.status = 'active'
    )
  );

-- Política para que admin-campus y coordinadores vean materiales de cursos de su institución
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_materials" ON public.materials;

CREATE POLICY "admin_campus_coordinator_view_institution_materials" ON public.materials
  FOR SELECT
  USING (
    (public.is_admin_campus() OR public.is_coordinator())
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
        AND c.status = 'active'
    )
  );

-- =====================================================
-- PASO 6: Verificar políticas creadas
-- =====================================================

SELECT 
  'Políticas creadas para cursos' as verificacion,
  schemaname,
  tablename,
  policyname,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'course_units', 'sessions', 'materials')
  AND policyname LIKE '%supervisor%' 
     OR policyname LIKE '%admin_campus%'
     OR policyname LIKE '%coordinator%'
ORDER BY tablename, policyname;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas RLS agregadas para supervisores, admin-campus y coordinadores';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas creadas:';
  RAISE NOTICE '   - supervisor_view_institution_courses (cursos)';
  RAISE NOTICE '   - admin_campus_coordinator_view_institution_courses (cursos)';
  RAISE NOTICE '   - supervisor_view_institution_course_units (unidades)';
  RAISE NOTICE '   - admin_campus_coordinator_view_institution_course_units (unidades)';
  RAISE NOTICE '   - supervisor_view_institution_sessions (sesiones)';
  RAISE NOTICE '   - admin_campus_coordinator_view_institution_sessions (sesiones)';
  RAISE NOTICE '   - supervisor_view_institution_materials (materiales)';
  RAISE NOTICE '   - admin_campus_coordinator_view_institution_materials (materiales)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Próximos pasos:';
  RAISE NOTICE '   1. Los supervisores ahora pueden ver todos los cursos activos de su institución';
  RAISE NOTICE '   2. Pueden acceder al Tutor AI de cualquier curso de su institución';
  RAISE NOTICE '   3. No necesitan estar inscritos como estudiantes';
END $$;

