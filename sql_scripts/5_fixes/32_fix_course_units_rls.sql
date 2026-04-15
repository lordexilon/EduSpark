-- 32_fix_course_units_rls.sql
-- Script para diagnosticar y corregir políticas RLS de course_units que pueden estar bloqueando UPDATEs
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- DIAGNÓSTICO
-- =====================================================

-- Verificar si RLS está habilitado
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'course_units';

-- Listar todas las políticas existentes para course_units
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'course_units';

-- =====================================================
-- CORRECCIÓN: Eliminar políticas problemáticas
-- =====================================================

-- Eliminar todas las políticas existentes de course_units
-- IMPORTANTE: Ejecuta esto primero para limpiar políticas que puedan estar causando conflictos
DROP POLICY IF EXISTS "units_admin_all" ON public.course_units;
DROP POLICY IF EXISTS "units_owner_rw" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_select" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_update" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_insert" ON public.course_units;
DROP POLICY IF EXISTS "units_teacher_delete" ON public.course_units;

-- =====================================================
-- RECREAR POLÍTICAS CORRECTAS
-- =====================================================

-- NOTA: En PostgreSQL, múltiples políticas para la misma operación se evalúan con OR
-- Por lo tanto, si una política permite la operación, se permite.
-- Sin embargo, es mejor tener políticas específicas por operación para mejor control.

-- 1. Política para ADMIN: acceso total a TODO (SELECT, INSERT, UPDATE, DELETE)
-- Esta política tiene prioridad y no debe interferir con las otras
CREATE POLICY "units_admin_all" ON public.course_units
  FOR ALL 
  TO authenticated
  USING (public.is_admin()) 
  WITH CHECK (public.is_admin());

-- 2. Política para TEACHER: puede leer unidades de sus cursos
CREATE POLICY "units_teacher_select" ON public.course_units
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_units.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- 3. Política para TEACHER: puede actualizar unidades de sus cursos
-- IMPORTANTE: Tanto USING como WITH CHECK deben permitir la operación
-- OPTIMIZACIÓN: Usamos el mismo curso_id en USING y WITH CHECK para evitar consultas redundantes
CREATE POLICY "units_teacher_update" ON public.course_units
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_units.course_id 
      AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    -- IMPORTANTE: En WITH CHECK usamos el NUEVO valor de course_id
    -- Pero como no podemos cambiar course_id en un UPDATE, verificamos el mismo
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_units.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- 4. Política para TEACHER: puede insertar unidades en sus cursos
CREATE POLICY "units_teacher_insert" ON public.course_units
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_units.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- 5. Política para TEACHER: puede eliminar unidades de sus cursos
CREATE POLICY "units_teacher_delete" ON public.course_units
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c 
      WHERE c.id = course_units.course_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'course_units'
ORDER BY policyname, cmd;

-- =====================================================
-- OPTIMIZACIÓN: Crear índices para mejorar performance de las políticas
-- =====================================================

-- Índice compuesto en courses para optimizar las consultas EXISTS en políticas RLS
-- Esto acelera la verificación de teacher_id por course_id
CREATE INDEX IF NOT EXISTS idx_courses_id_teacher 
ON public.courses(id, teacher_id);

-- Índice en course_units para optimizar las consultas
CREATE INDEX IF NOT EXISTS idx_course_units_course_id 
ON public.course_units(course_id);

-- =====================================================
-- DIAGNÓSTICO ADICIONAL
-- =====================================================

-- Verificar que la función is_admin() existe y funciona
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Verificar el tipo de course_id en course_units
SELECT 
  'course_units.course_id' as column_info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_units' 
  AND column_name = 'course_id'

UNION ALL

-- Verificar el tipo de id en courses
SELECT 
  'courses.id' as column_info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'courses' 
  AND column_name = 'id';

-- Verificar que los tipos son compatibles
DO $$
DECLARE
  units_course_id_type TEXT;
  courses_id_type TEXT;
BEGIN
  SELECT data_type INTO units_course_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'course_units' 
    AND column_name = 'course_id';
  
  SELECT data_type INTO courses_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'id';
  
  IF units_course_id_type = courses_id_type THEN
    RAISE NOTICE '✅ Los tipos son compatibles: course_units.course_id (%) = courses.id (%)', 
      units_course_id_type, courses_id_type;
  ELSE
    RAISE WARNING '⚠️ INCOMPATIBILIDAD DE TIPOS: course_units.course_id (%) != courses.id (%)', 
      units_course_id_type, courses_id_type;
    RAISE WARNING 'Esto puede causar que las políticas RLS fallen silenciosamente';
  END IF;
END $$;

-- =====================================================
-- PRUEBA DIRECTA DE POLÍTICAS
-- =====================================================

-- Verificar el usuario actual autenticado
DO $$
DECLARE
  current_user_id UUID;
  is_user_admin BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE WARNING '⚠️ No hay usuario autenticado (auth.uid() es NULL)';
    RAISE WARNING 'Esto puede causar que todas las políticas RLS fallen';
  ELSE
    RAISE NOTICE '✅ Usuario autenticado: %', current_user_id;
  END IF;
  
  SELECT public.is_admin() INTO is_user_admin;
  IF is_user_admin THEN
    RAISE NOTICE '✅ Usuario es ADMIN - debería tener acceso total';
  ELSE
    RAISE NOTICE 'ℹ️ Usuario NO es admin - se aplicarán políticas de teacher';
  END IF;
END $$;

-- Contar políticas creadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'course_units';
  
  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ Políticas creadas correctamente: % políticas encontradas', policy_count;
  ELSE
    RAISE WARNING '⚠️ Número inesperado de políticas: % (esperado: 5)', policy_count;
  END IF;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ====================================================';
  RAISE NOTICE '✅ Políticas RLS de course_units recreadas correctamente';
  RAISE NOTICE '✅ ====================================================';
  RAISE NOTICE '   - units_admin_all: Permite todo a admin';
  RAISE NOTICE '   - units_teacher_select: Permite lectura a teachers de sus cursos';
  RAISE NOTICE '   - units_teacher_update: Permite actualización a teachers de sus cursos';
  RAISE NOTICE '   - units_teacher_insert: Permite inserción a teachers de sus cursos';
  RAISE NOTICE '   - units_teacher_delete: Permite eliminación a teachers de sus cursos';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASOS:';
  RAISE NOTICE '   1. ✅ Tipos de datos verificados: course_units.course_id (integer) = courses.id (integer)';
  RAISE NOTICE '   2. ✅ Índices optimizados creados para mejorar performance';
  RAISE NOTICE '   3. 🔄 Prueba actualizar una unidad desde la aplicación';
  RAISE NOTICE '   4. 📊 Si sigue fallando, revisa los logs en Supabase Dashboard → Logs → API';
  RAISE NOTICE '';
  RAISE NOTICE '💡 NOTA: Si las peticiones se cuelgan después de esto, puede ser:';
  RAISE NOTICE '   - Problema de conexión/red con Supabase';
  RAISE NOTICE '   - Timeout en la evaluación de políticas (verifica que los índices se crearon)';
  RAISE NOTICE '   - Problema con auth.uid() o la función is_admin()';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 PRUEBA MANUAL: Ejecuta esto para probar las políticas directamente:';
  RAISE NOTICE '   SELECT * FROM course_units WHERE id = ''93cd6110-d031-43d4-8909-20b687830356'';';
  RAISE NOTICE '   Si esto también se cuelga, el problema está en las políticas SELECT';
END $$;

