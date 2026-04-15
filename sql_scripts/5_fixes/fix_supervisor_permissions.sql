
-- =====================================================
-- Script: Corregir permisos de supervisor para ver y usar tutores
-- Descripción: Asegura que supervisores puedan ver cursos y usar el tutor
--              de su institución sin necesidad de estar inscritos.
-- =====================================================

-- 0. Asegurar que las funciones helper existen
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'supervisor'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_institution_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id
  FROM public.user_institutions
  WHERE user_id = auth.uid()
    AND is_primary = true
  LIMIT 1;
$$;

-- 1. Políticas para CURSOS
DROP POLICY IF EXISTS "supervisor_view_institution_courses" ON public.courses;
CREATE POLICY "supervisor_view_institution_courses" ON public.courses
  FOR SELECT
  USING (
    public.is_supervisor()
    AND institution_id = public.get_user_primary_institution_id()
    AND status = 'active'
  );

-- 2. Políticas para UNIDADES
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

-- 3. Políticas para SESIONES
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

-- 4. Políticas para MATERIALES
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

-- 5. Políticas para USUARIOS (para ver nombres de profesores)
DROP POLICY IF EXISTS "supervisor_view_institution_users" ON public.users;
CREATE POLICY "supervisor_view_institution_users" ON public.users
  FOR SELECT
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.user_institutions ui_target
      JOIN public.user_institutions ui_me ON ui_target.institution_id = ui_me.institution_id
      WHERE ui_target.user_id = users.id
      AND ui_me.user_id = auth.uid()
    )
  );

-- 6. Políticas para CONFIGURACIÓN PEDAGÓGICA
DROP POLICY IF EXISTS "supervisor_manage_pedagogical_settings" ON public.course_pedagogical_settings;
CREATE POLICY "supervisor_manage_pedagogical_settings" ON public.course_pedagogical_settings
  FOR ALL
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_pedagogical_settings.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
    )
  );

-- 7. Políticas para ESCALAS DE CALIFICACIÓN
DROP POLICY IF EXISTS "supervisor_view_grading_scales" ON public.course_grading_scales;
CREATE POLICY "supervisor_view_grading_scales" ON public.course_grading_scales
  FOR SELECT
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_grading_scales.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
    )
  );

-- 8. Políticas para IMÁGENES DEL CURSO
DROP POLICY IF EXISTS "supervisor_view_course_images" ON public.course_images;
CREATE POLICY "supervisor_view_course_images" ON public.course_images
  FOR SELECT
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_images.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
    )
  );

-- 9. Políticas para CONVERSACIONES DEL TUTOR (Permitir crear y ver sus propias conversaciones en cualquier curso de la institución)
DROP POLICY IF EXISTS "supervisor_manage_tutor_conversations" ON public.tutor_conversations;
CREATE POLICY "supervisor_manage_tutor_conversations" ON public.tutor_conversations
  FOR ALL
  USING (
    public.is_supervisor()
    AND auth.uid() = student_id -- Solo sus propias conversaciones
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tutor_conversations.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
    )
  )
  WITH CHECK (
    public.is_supervisor()
    AND auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = tutor_conversations.course_id
        AND c.institution_id = public.get_user_primary_institution_id()
    )
  );

-- 10. Políticas para MENSAJES DEL TUTOR
DROP POLICY IF EXISTS "supervisor_manage_tutor_messages" ON public.tutor_messages;
CREATE POLICY "supervisor_manage_tutor_messages" ON public.tutor_messages
  FOR ALL
  USING (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.tutor_conversations tc
      WHERE tc.id = tutor_messages.conversation_id
        AND tc.student_id = auth.uid() -- Solo mensajes de sus propias conversaciones
    )
  )
  WITH CHECK (
    public.is_supervisor()
    AND EXISTS (
      SELECT 1 FROM public.tutor_conversations tc
      WHERE tc.id = tutor_messages.conversation_id
        AND tc.student_id = auth.uid()
    )
  );

