-- =====================================================
-- MIGRACIÓN SQL: Resolución de Deuda Técnica TD-02
-- Objetivo: Vincular unit_id y session_id a chunks históricos
-- Fecha: 2026-05-23
-- =====================================================

DO $$
DECLARE
    v_total_to_update INTEGER;
BEGIN
    -- 1. Calcular cuántos registros se verán afectados
    SELECT COUNT(*)
    INTO v_total_to_update
    FROM public.course_content_chunks ccc
    JOIN public.course_materials cm ON ccc.metadata->>'material_id' = cm.id::text
    WHERE (ccc.unit_id IS NULL OR ccc.session_id IS NULL)
      AND (cm.unit_id IS NOT NULL OR cm.session_id IS NOT NULL);

    RAISE NOTICE 'Total de chunks históricos identificados para actualizar: %', v_total_to_update;

    -- 2. Ejecutar la actualización directa si hay registros
    IF v_total_to_update > 0 THEN
        UPDATE public.course_content_chunks ccc
        SET 
          unit_id = cm.unit_id,
          session_id = cm.session_id
        FROM public.course_materials cm
        WHERE ccc.metadata->>'material_id' = cm.id::text
          AND (ccc.unit_id IS NULL OR ccc.session_id IS NULL)
          AND (cm.unit_id IS NOT NULL OR cm.session_id IS NOT NULL);

        RAISE NOTICE 'Actualización completada de forma segura.';
    ELSE
        RAISE NOTICE 'No se encontraron chunks históricos huérfanos de unit_id/session_id.';
    END IF;
END $$;
