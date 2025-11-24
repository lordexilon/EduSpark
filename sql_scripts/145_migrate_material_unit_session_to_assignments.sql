-- =====================================================
-- Migrar datos de unit_id y session_id de materials a tablas de asignación
-- =====================================================
-- Este script migra los datos existentes de unit_id y session_id en la tabla materials
-- a las nuevas tablas material_unit_assignments y material_session_assignments

-- 1. Migrar unit_id a material_unit_assignments
INSERT INTO public.material_unit_assignments (material_id, unit_id, assigned_by, assigned_at)
SELECT 
    m.id as material_id,
    m.unit_id,
    c.teacher_id as assigned_by,
    COALESCE(m.created_at, NOW()) as assigned_at
FROM public.materials m
JOIN public.courses c ON c.id = m.course_id
WHERE m.unit_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM public.material_unit_assignments mua 
      WHERE mua.material_id = m.id 
        AND mua.unit_id = m.unit_id
  );

-- 2. Migrar session_id a material_session_assignments
INSERT INTO public.material_session_assignments (material_id, session_id, assigned_by, assigned_at)
SELECT 
    m.id as material_id,
    m.session_id,
    c.teacher_id as assigned_by,
    COALESCE(m.created_at, NOW()) as assigned_at
FROM public.materials m
JOIN public.courses c ON c.id = m.course_id
WHERE m.session_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM public.material_session_assignments msa 
      WHERE msa.material_id = m.id 
        AND msa.session_id = m.session_id
  );

-- 3. Reporte de migración
DO $$
DECLARE
    v_unit_migrations INT;
    v_session_migrations INT;
BEGIN
    SELECT COUNT(*) INTO v_unit_migrations
    FROM public.material_unit_assignments mua
    WHERE EXISTS (
        SELECT 1 FROM public.materials m 
        WHERE m.id = mua.material_id 
          AND m.unit_id = mua.unit_id
    );
    
    SELECT COUNT(*) INTO v_session_migrations
    FROM public.material_session_assignments msa
    WHERE EXISTS (
        SELECT 1 FROM public.materials m 
        WHERE m.id = msa.material_id 
          AND m.session_id = msa.session_id
    );
    
    RAISE NOTICE '✅ Migración completada:';
    RAISE NOTICE '   - Unidades migradas: %', v_unit_migrations;
    RAISE NOTICE '   - Sesiones migradas: %', v_session_migrations;
END $$;

-- NOTA: Los campos unit_id y session_id en la tabla materials NO se eliminan
-- para mantener compatibilidad durante la transición. Una vez que se confirme
-- que todo funciona correctamente, se pueden hacer NULL o eliminar en un script futuro.
--
-- Descripción: Migra datos de unit_id y session_id de materials a tablas de asignación múltiple

