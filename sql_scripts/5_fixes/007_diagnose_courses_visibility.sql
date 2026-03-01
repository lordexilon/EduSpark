-- =====================================================
-- DIAGNÓSTICO: Visibilidad de Cursos para Institución 2
-- =====================================================

DO $$
DECLARE
    v_inst_id INTEGER := 2; -- ID de tu institución (Cacavelos)
    v_total INTEGER;
    v_active INTEGER;
    v_with_settings INTEGER;
BEGIN
    RAISE NOTICE '--- INICIO DIAGNÓSTICO ---';
    
    -- 1. Contar cursos totales para la institución (bypass RLS)
    SELECT count(*) INTO v_total 
    FROM courses 
    WHERE institution_id = v_inst_id;
    
    RAISE NOTICE 'Total Cursos en Inst %: %', v_inst_id, v_total;

    -- 2. Contar cursos ACTIVOS (lo que busca el selector)
    SELECT count(*) INTO v_active 
    FROM courses 
    WHERE institution_id = v_inst_id 
    AND status = 'active';
    
    RAISE NOTICE 'Cursos ACTIVOS en Inst %: %', v_inst_id, v_active;

    -- 3. Verificar si tienen settings pedagógicos (posible punto de fallo en el join)
    SELECT count(DISTINCT c.id) INTO v_with_settings
    FROM courses c
    JOIN course_pedagogical_settings s ON c.id = s.course_id
    WHERE c.institution_id = v_inst_id;
    
    RAISE NOTICE 'Cursos con configuración pedagógica: %', v_with_settings;

    -- 4. Verificar roles y políticas
    RAISE NOTICE '--- POLÍTICAS RLS ACTIVAS ---';
END $$;

-- 5. Listar las políticas actuales para estar seguros
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'courses' OR tablename = 'course_pedagogical_settings';
