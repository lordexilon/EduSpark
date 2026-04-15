-- 41_create_update_learning_objectives_rpc.sql
-- Función RPC para actualizar learning_objectives evitando problemas de serialización del cliente
-- Ejecutar en el SQL Editor de Supabase
--
-- ⚠️ IMPORTANTE: Antes de ejecutar este script, asegúrate de ejecutar:
--   42_add_updated_at_to_course_units.sql
--   para agregar la columna updated_at a la tabla course_units

-- =====================================================
-- CREAR FUNCIÓN RPC PARA ACTUALIZAR learning_objectives
-- =====================================================

-- Eliminar la función existente si existe (para permitir cambiar nombres de parámetros)
DROP FUNCTION IF EXISTS public.update_unit_learning_objectives(UUID, TEXT[]);

CREATE OR REPLACE FUNCTION public.update_unit_learning_objectives(
  unit_id UUID,
  objectives TEXT[]
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  learning_objectives TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario tenga permiso para actualizar esta unidad
  -- (pertenece a un curso del profesor autenticado o es admin)
  IF NOT EXISTS (
    SELECT 1
    FROM public.course_units cu_inner
    INNER JOIN public.courses c_inner ON c_inner.id = cu_inner.course_id
    WHERE cu_inner.id = unit_id
      AND (
        c_inner.teacher_id = auth.uid()
        OR public.is_admin()
      )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para actualizar esta unidad o la unidad no existe';
  END IF;

  -- Actualizar learning_objectives y devolver los datos actualizados
  RETURN QUERY
  UPDATE public.course_units cu_update
  SET learning_objectives = objectives,
      updated_at = NOW()
  WHERE cu_update.id = unit_id
  RETURNING cu_update.id, cu_update.title, cu_update.learning_objectives;
END;
$$;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION public.update_unit_learning_objectives IS 
'Función RPC para actualizar learning_objectives de una unidad. Evita problemas de serialización del array TEXT[] desde el cliente JS.';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.update_unit_learning_objectives TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_unit_learning_objectives';

-- =====================================================
-- PRUEBA MANUAL (OPCIONAL)
-- =====================================================

-- Descomentar para probar la función:
/*
SELECT * FROM public.update_unit_learning_objectives(
  '93cd6110-d031-43d4-8909-20b687830356'::UUID,
  ARRAY['Objetivo 1', 'Objetivo 2', 'Objetivo 3']::TEXT[]
);
*/

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Función RPC creada exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE 'Esta función evita problemas de serialización del array TEXT[]';
  RAISE NOTICE 'desde Supabase JS client al manejar el array directamente en PostgreSQL.';
  RAISE NOTICE '';
  RAISE NOTICE 'La función verifica automáticamente los permisos RLS';
  RAISE NOTICE 'usando auth.uid() del usuario autenticado.';
END $$;

