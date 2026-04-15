-- Fix RLS policies for sessions, course_units and materials
-- Specifically to allow admin-campus to create/manage content

-- =====================================================
-- 1. SESSIONS
-- =====================================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_admin_all" ON public.sessions;
DROP POLICY IF EXISTS "sessions_owner_rw" ON public.sessions;
DROP POLICY IF EXISTS "sessions_institution_access" ON public.sessions;

CREATE POLICY "sessions_admin_all" ON public.sessions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "sessions_owner_rw" ON public.sessions
  FOR ALL USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND c.teacher_id = auth.uid()
    )
  ) WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "sessions_institution_access" ON public.sessions
  FOR ALL USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND public.has_institution_access(c.institution_id)
    )
  ) WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND public.has_institution_access(c.institution_id)
    )
  );

-- =====================================================
-- 2. COURSE UNITS
-- =====================================================
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "units_admin_all" ON public.course_units;
DROP POLICY IF EXISTS "units_owner_rw" ON public.course_units;
DROP POLICY IF EXISTS "units_institution_access" ON public.course_units;

CREATE POLICY "units_admin_all" ON public.course_units
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "units_owner_rw" ON public.course_units
  FOR ALL USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND c.teacher_id = auth.uid()
    )
  ) WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "units_institution_access" ON public.course_units
  FOR ALL USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND public.has_institution_access(c.institution_id)
    )
  ) WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND public.has_institution_access(c.institution_id)
    )
  );

-- =====================================================
-- 3. MATERIALS
-- =====================================================
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials_admin_all" ON public.materials;
DROP POLICY IF EXISTS "materials_owner_rw" ON public.materials;
DROP POLICY IF EXISTS "materials_institution_access" ON public.materials;

CREATE POLICY "materials_admin_all" ON public.materials
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "materials_owner_rw" ON public.materials
  FOR ALL USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND c.teacher_id = auth.uid()
    )
  ) WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "materials_institution_access" ON public.materials
  FOR ALL USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND public.has_institution_access(c.institution_id)
    )
  ) WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND public.has_institution_access(c.institution_id)
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Policies for sessions, units and materials updated.';
END $$;
