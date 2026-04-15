-- 63_fix_career_enrollments_rls.sql
-- Corrige las políticas RLS de career_enrollments para permitir que admins/coordinators/teachers
-- puedan inscribir estudiantes en carreras
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS EXISTENTES DE INSERT/UPDATE
-- =====================================================

DROP POLICY IF EXISTS "students_enroll_in_careers" ON public.career_enrollments;
DROP POLICY IF EXISTS "coordinators_insert_career_enrollments" ON public.career_enrollments;
DROP POLICY IF EXISTS "admins_insert_career_enrollments" ON public.career_enrollments;
DROP POLICY IF EXISTS "coordinators_update_career_enrollments" ON public.career_enrollments;
DROP POLICY IF EXISTS "admins_update_career_enrollments" ON public.career_enrollments;

-- =====================================================
-- PASO 2: CREAR FUNCIÓN HELPER PARA VERIFICAR ROLES
-- =====================================================

-- Función para verificar si el usuario es admin o coordinator
CREATE OR REPLACE FUNCTION public.is_admin_or_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
  );
$$;

-- Función para verificar si el usuario es teacher, admin o coordinator
CREATE OR REPLACE FUNCTION public.is_teacher_admin_or_coordinator()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator', 'teacher')
  );
$$;

-- =====================================================
-- PASO 3: CREAR NUEVAS POLÍTICAS PARA INSERT
-- =====================================================

-- Estudiantes pueden inscribirse a sí mismos
CREATE POLICY "students_enroll_in_careers"
  ON public.career_enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Administradores y coordinadores pueden inscribir cualquier estudiante
CREATE POLICY "admins_coordinators_insert_career_enrollments"
  ON public.career_enrollments FOR INSERT
  WITH CHECK (public.is_admin_or_coordinator());

-- =====================================================
-- PASO 4: CREAR POLÍTICAS PARA UPDATE
-- =====================================================

-- Estudiantes pueden actualizar sus propias inscripciones (solo ciertos campos)
CREATE POLICY "students_update_own_enrollments"
  ON public.career_enrollments FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Coordinadores pueden actualizar inscripciones de sus carreras
CREATE POLICY "coordinators_update_career_enrollments"
  ON public.career_enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.careers c
      WHERE c.id = career_enrollments.career_id
      AND (c.coordinator_id = auth.uid() OR public.is_admin_or_coordinator())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.careers c
      WHERE c.id = career_enrollments.career_id
      AND (c.coordinator_id = auth.uid() OR public.is_admin_or_coordinator())
    )
  );

-- Administradores pueden actualizar cualquier inscripción
CREATE POLICY "admins_update_all_career_enrollments"
  ON public.career_enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'admin'
    )
  );

-- =====================================================
-- PASO 5: VERIFICAR POLÍTICAS CREADAS
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Lectura'
    WHEN cmd = 'INSERT' THEN 'Inserción'
    WHEN cmd = 'UPDATE' THEN 'Actualización'
    WHEN cmd = 'DELETE' THEN 'Eliminación'
    ELSE cmd
  END as operacion,
  qual as condicion_using,
  with_check as condicion_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'career_enrollments'
ORDER BY cmd, policyname;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'CORRECCIÓN DE POLÍTICAS RLS PARA career_enrollments';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas creadas:';
  RAISE NOTICE '   1. students_enroll_in_careers - Estudiantes pueden inscribirse a sí mismos';
  RAISE NOTICE '   2. admins_coordinators_insert_career_enrollments - Admins/Coordinators pueden inscribir cualquier estudiante';
  RAISE NOTICE '   3. students_update_own_enrollments - Estudiantes pueden actualizar sus inscripciones';
  RAISE NOTICE '   4. coordinators_update_career_enrollments - Coordinadores pueden actualizar inscripciones de sus carreras';
  RAISE NOTICE '   5. admins_update_all_career_enrollments - Admins pueden actualizar cualquier inscripción';
  RAISE NOTICE '';
  RAISE NOTICE 'Ahora los administradores y coordinadores pueden inscribir estudiantes';
  RAISE NOTICE 'en carreras desde la página de gestión de estudiantes.';
  RAISE NOTICE '';
END $$;

