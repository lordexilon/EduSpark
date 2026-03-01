-- 36_simplify_course_units_rls.sql
-- Script para simplificar las políticas RLS de course_units
-- Elimina las consultas EXISTS complejas que pueden estar causando timeouts
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- ELIMINAR POLÍTICAS COMPLEJAS
-- =====================================================

DROP POLICY IF EXISTS "units_admin_all" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_select" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_update" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_insert" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_delete" ON public.course_units;

-- =====================================================
-- CREAR POLÍTICAS SIMPLIFICADAS
-- =====================================================

-- Política para ADMIN: acceso total (sin consultas complejas)
CREATE POLICY "units_admin_all" ON public.course_units
  FOR ALL 
  TO authenticated
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- Política simplificada para TEACHER: usar JOIN directo en lugar de EXISTS
-- Esto debería ser más rápido
CREATE POLICY "units_teacher_select" ON public.course_units
  FOR SELECT 
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "units_teacher_update" ON public.course_units
  FOR UPDATE 
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "units_teacher_insert" ON public.course_units
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "units_teacher_delete" ON public.course_units
  FOR DELETE 
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE teacher_id = auth.uid()
    )
  );

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'course_units'
ORDER BY policyname, cmd;

DO $$
BEGIN
  RAISE NOTICE '✅ Políticas simplificadas creadas';
  RAISE NOTICE 'Se reemplazaron consultas EXISTS por subconsultas IN';
  RAISE NOTICE 'Esto debería mejorar el rendimiento';
END $$;

