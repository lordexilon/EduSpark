-- =====================================================
-- FIX: Visibilidad de Cursos para Admin Campus
-- =====================================================

-- 1. Asegurar que la función helper es segura y correcta
CREATE OR REPLACE FUNCTION public.is_admin_or_manager_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID;
  v_role_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;
  
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = v_user_id;
  
  RETURN COALESCE(v_role_name IN ('admin', 'admin-campus', 'coordinator', 'supervisor'), false);
END;
$$;

-- 2. Actualizar políticas de courses
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_view_admin_campus" ON public.courses;

CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL 
  TO authenticated
  USING (public.is_admin_or_manager_safe())
  WITH CHECK (public.is_admin_or_manager_safe());

-- 3. Asegurar visibilidad de course_pedagogical_settings
ALTER TABLE public.course_pedagogical_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_admin_all" ON public.course_pedagogical_settings;

CREATE POLICY "settings_admin_all" ON public.course_pedagogical_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager_safe())
  WITH CHECK (public.is_admin_or_manager_safe());

-- Política para que teachers vean settings de SUS cursos
DROP POLICY IF EXISTS "settings_teacher_own" ON public.course_pedagogical_settings;

CREATE POLICY "settings_teacher_own" ON public.course_pedagogical_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_pedagogical_settings.course_id
      AND c.teacher_id = auth.uid()
    )
  );

-- 4. Notificar
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas de visibilidad actualizadas para admin-campus';
END $$;
