-- =====================================================
-- DIAGNÓSTICO SOLO LECTURA: Curso 12
-- =====================================================

DO $$
DECLARE
    v_course_id BIGINT := 12;
    v_rec RECORD;
    v_settings_count INTEGER;
    v_inst_count INTEGER;
BEGIN
    RAISE NOTICE '--- ANALIZANDO CURSO % ---', v_course_id;

    -- 1. Verificar existencia y datos básicos
    SELECT * INTO v_rec 
    FROM courses 
    WHERE id = v_course_id;

    IF v_rec.id IS NULL THEN
        RAISE NOTICE '❌ El curso % NO EXISTE en la tabla courses.', v_course_id;
        RETURN;
    END IF;

    RAISE NOTICE '✅ Curso Encontrado: "%"', v_rec.title;
    RAISE NOTICE '   Estado: %', v_rec.status;
    RAISE NOTICE '   Institución ID del curso: %', v_rec.institution_id;
    RAISE NOTICE '   Profesor ID: %', v_rec.teacher_id;

    -- 2. Verificar si pertenece a tu institución (ID 2)
    IF v_rec.institution_id = 2 THEN
        RAISE NOTICE '✅ Pertenece a la Institución Correcta (2 - Cacavelos).';
    ELSE
        RAISE NOTICE '⚠️ ALERTA: Pertenece a Institución ID % (Se esperaba 2).', v_rec.institution_id;
    END IF;

    -- 3. Verificar Configuración del Tutor
    SELECT count(*) INTO v_settings_count 
    FROM course_pedagogical_settings 
    WHERE course_id = v_course_id::text::uuid; -- Intento de cast si es necesario, o directo

    -- Nota: Verificar si course_pedagogical_settings usa UUID o BIGINT para course_id
    -- Si falla el cast anterior, Supabase avisará. Asumimos UUID por esquema previo.

    IF v_settings_count > 0 THEN
        RAISE NOTICE '✅ Tiene configuración de Tutor (% registro/s).', v_settings_count;
    ELSE
        RAISE NOTICE '⚠️ ALERTA: NO tiene configuración en course_pedagogical_settings.';
        RAISE NOTICE '   (Esto puede hacer que el Tutor no aparezca o falle el join)';
    END IF;

    -- 4. Verificar visibilidad (RLS Mock)
    -- Esto simula si un SELECT simple devolvería el curso con las políticas actuales
    -- Nota: Esto depende de quién ejecute el script (rol postgres suele ver todo)
    RAISE NOTICE '--- FIN ANÁLISIS ---';
END $$;
