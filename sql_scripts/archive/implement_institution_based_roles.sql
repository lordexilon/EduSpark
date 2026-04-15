-- sql_scripts/implement_institution_based_roles.sql
-- Script para implementar sistema de roles basado en instituciones
-- Admin: ve todo (sin restricción de institución)
-- Admin-campus, Coordinador, Teacher, Student: solo ven datos de su institución

-- =====================================================
-- 1. AGREGAR ROL 'admin-campus'
-- =====================================================

-- Insertar rol admin-campus si no existe
INSERT INTO public.roles (name, description)
VALUES ('admin-campus', 'Administrador de campus/institución')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. FUNCIONES HELPER PARA ROLES E INSTITUCIONES
-- =====================================================

-- Función para verificar si es admin (super admin, sin restricción de institución)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  );
$$;

-- Función para obtener la institución primaria del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT institution_id
  FROM public.user_institutions
  WHERE user_id = auth.uid()
    AND is_primary = true
  LIMIT 1;
$$;

-- Función para verificar si el usuario pertenece a una institución específica
CREATE OR REPLACE FUNCTION public.user_belongs_to_institution(p_institution_id INTEGER)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_institutions
    WHERE user_id = auth.uid()
      AND institution_id = p_institution_id
  );
$$;

-- Función para verificar si es admin-campus
CREATE OR REPLACE FUNCTION public.is_admin_campus()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin-campus'
  );
$$;

-- Función para verificar si es coordinador
CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'coordinator'
  );
$$;

-- Función para verificar si es teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'teacher'
  );
$$;

-- Función para verificar si es student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'student'
  );
$$;

-- Función para verificar si el usuario tiene acceso a una institución
-- (admin ve todo, otros solo su institución)
CREATE OR REPLACE FUNCTION public.has_institution_access(p_institution_id INTEGER)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    public.is_admin() OR 
    (public.get_user_institution_id() = p_institution_id);
$$;

-- =====================================================
-- 3. ACTUALIZAR POLÍTICAS RLS PARA COURSES
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_owner_rw" ON public.courses;
DROP POLICY IF EXISTS "courses_institution_access" ON public.courses;

-- Admin ve todo
CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL 
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Admin-campus, coordinador y teacher ven cursos de su institución
CREATE POLICY "courses_institution_access" ON public.courses
  FOR ALL
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR 
      public.is_teacher()
    ) AND
    public.has_institution_access(institution_id)
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR 
      public.is_teacher()
    ) AND
    public.has_institution_access(institution_id)
  );

-- Teacher puede ver sus propios cursos (aunque no tengan institution_id)
CREATE POLICY "courses_owner_rw" ON public.courses
  FOR ALL
  USING (
    NOT public.is_admin() AND
    public.is_teacher() AND
    teacher_id = auth.uid()
  )
  WITH CHECK (
    NOT public.is_admin() AND
    public.is_teacher() AND
    teacher_id = auth.uid()
  );

-- =====================================================
-- 4. ACTUALIZAR POLÍTICAS RLS PARA USERS
-- =====================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_institution_access" ON public.users;
DROP POLICY IF EXISTS "users_institution_update" ON public.users;
DROP POLICY IF EXISTS "users_own_read" ON public.users;

-- Admin ve todos los usuarios
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-campus, coordinador y teacher ven usuarios de su institución
CREATE POLICY "users_institution_access" ON public.users
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher()
    ) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Admin-campus, coordinador y teacher pueden actualizar usuarios de su institución
CREATE POLICY "users_institution_update" ON public.users
  FOR UPDATE
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher()
    ) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator() OR
      public.is_teacher()
    ) AND
    public.get_user_institution_id() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_institutions ui
      WHERE ui.user_id = users.id
        AND ui.institution_id = public.get_user_institution_id()
        AND ui.is_primary = true
    )
  );

-- Usuarios pueden ver su propio perfil
CREATE POLICY "users_own_read" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- =====================================================
-- 5. ACTUALIZAR POLÍTICAS RLS PARA INSTITUTIONS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "institutions_read_all" ON public.institutions;
DROP POLICY IF EXISTS "institutions_admin_all" ON public.institutions;
DROP POLICY IF EXISTS "institutions_institution_access" ON public.institutions;
DROP POLICY IF EXISTS "institutions_institution_update" ON public.institutions;

-- Admin ve todas las instituciones
CREATE POLICY "institutions_admin_all" ON public.institutions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Otros usuarios ven solo su institución
CREATE POLICY "institutions_institution_access" ON public.institutions
  FOR SELECT
  USING (
    NOT public.is_admin() AND
    id = public.get_user_institution_id()
  );

-- Admin-campus y coordinador pueden actualizar su institución
CREATE POLICY "institutions_institution_update" ON public.institutions
  FOR UPDATE
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator()
    ) AND
    id = public.get_user_institution_id()
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator()
    ) AND
    id = public.get_user_institution_id()
  );

-- =====================================================
-- 6. ACTUALIZAR POLÍTICAS RLS PARA USER_INSTITUTIONS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "user_institutions_own_read" ON public.user_institutions;
DROP POLICY IF EXISTS "user_institutions_admin_all" ON public.user_institutions;
DROP POLICY IF EXISTS "user_institutions_institution_access" ON public.user_institutions;

-- Admin ve todas las asignaciones
CREATE POLICY "user_institutions_admin_all" ON public.user_institutions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Usuarios ven sus propias asignaciones
CREATE POLICY "user_institutions_own_read" ON public.user_institutions
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin-campus y coordinador ven asignaciones de su institución
CREATE POLICY "user_institutions_institution_access" ON public.user_institutions
  FOR ALL
  USING (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator()
    ) AND
    institution_id = public.get_user_institution_id()
  )
  WITH CHECK (
    NOT public.is_admin() AND
    (
      public.is_admin_campus() OR 
      public.is_coordinator()
    ) AND
    institution_id = public.get_user_institution_id()
  );

-- =====================================================
-- 7. ACTUALIZAR POLÍTICAS PARA OTRAS TABLAS IMPORTANTES
-- =====================================================

-- Course Units: seguir la misma lógica que courses
DROP POLICY IF EXISTS "units_admin_all" ON public.course_units;
DROP POLICY IF EXISTS "units_owner_rw" ON public.course_units;
DROP POLICY IF EXISTS "units_institution_access" ON public.course_units;

CREATE POLICY "units_admin_all" ON public.course_units
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "units_institution_access" ON public.course_units
  FOR ALL
  USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND public.has_institution_access(c.institution_id)
    )
  )
  WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_units.course_id
        AND public.has_institution_access(c.institution_id)
    )
  );

-- Sessions: seguir la misma lógica que courses
DROP POLICY IF EXISTS "sessions_admin_all" ON public.sessions;
DROP POLICY IF EXISTS "sessions_owner_rw" ON public.sessions;
DROP POLICY IF EXISTS "sessions_institution_access" ON public.sessions;

CREATE POLICY "sessions_admin_all" ON public.sessions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sessions_institution_access" ON public.sessions
  FOR ALL
  USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND public.has_institution_access(c.institution_id)
    )
  )
  WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = sessions.course_id
        AND public.has_institution_access(c.institution_id)
    )
  );

-- Materials: seguir la misma lógica que courses
DROP POLICY IF EXISTS "materials_admin_all" ON public.materials;
DROP POLICY IF EXISTS "materials_owner_rw" ON public.materials;
DROP POLICY IF EXISTS "materials_institution_access" ON public.materials;

CREATE POLICY "materials_admin_all" ON public.materials
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "materials_institution_access" ON public.materials
  FOR ALL
  USING (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND public.has_institution_access(c.institution_id)
    )
  )
  WITH CHECK (
    NOT public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = materials.course_id
        AND public.has_institution_access(c.institution_id)
    )
  );

-- Careers: políticas basadas en institución
-- Nota: Requiere que careers tenga institution_id (verificar con verify_and_fix_institution_relationships.sql)
DROP POLICY IF EXISTS "careers_admin_all" ON public.careers;
DROP POLICY IF EXISTS "careers_institution_access" ON public.careers;

CREATE POLICY "careers_admin_all" ON public.careers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "careers_institution_access" ON public.careers
  FOR ALL
  USING (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  )
  WITH CHECK (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  );

-- Subjects: políticas basadas en institución
-- Nota: Requiere que subjects tenga institution_id (verificar con verify_and_fix_institution_relationships.sql)
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_institution_access" ON public.subjects;

CREATE POLICY "subjects_admin_all" ON public.subjects
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "subjects_institution_access" ON public.subjects
  FOR ALL
  USING (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  )
  WITH CHECK (
    NOT public.is_admin() AND
    public.has_institution_access(institution_id)
  );

-- =====================================================
-- 8. MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de roles basado en instituciones implementado:';
  RAISE NOTICE '   - Rol admin-campus creado';
  RAISE NOTICE '   - Funciones helper creadas';
  RAISE NOTICE '   - Políticas RLS actualizadas para filtrar por institución';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Roles y permisos:';
  RAISE NOTICE '   - admin: Ve todo (sin restricción)';
  RAISE NOTICE '   - admin-campus: Ve solo datos de su institución';
  RAISE NOTICE '   - coordinator: Ve solo datos de su institución';
  RAISE NOTICE '   - teacher: Ve solo datos de su institución';
  RAISE NOTICE '   - student: Ve solo datos de su institución';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Asegúrate de asignar una institución a todos los usuarios';
  RAISE NOTICE '   (excepto admin) usando la tabla user_institutions.';
END $$;

