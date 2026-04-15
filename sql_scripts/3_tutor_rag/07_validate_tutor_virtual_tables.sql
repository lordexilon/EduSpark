-- =====================================================
-- Script 07: Validación de Tablas del Tutor Virtual
-- Verifica que todas las tablas y políticas RLS estén correctamente creadas
-- =====================================================

-- Función para verificar si una tabla existe
CREATE OR REPLACE FUNCTION table_exists(table_name TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
    );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una política RLS existe
CREATE OR REPLACE FUNCTION policy_exists(table_name TEXT, policy_name TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = $1 
        AND policyname = $2
    );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si RLS está habilitado en una tabla
CREATE OR REPLACE FUNCTION rls_enabled(table_name TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = $1 
        AND relrowsecurity = true
    );
END;
$$ LANGUAGE plpgsql;

-- Verificar tablas del tutor virtual
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    expected_tables TEXT[] := ARRAY[
        'tutor_conversations',
        'tutor_messages', 
        'course_pedagogical_settings',
        'course_grading_scales',
        'student_learning_profiles',
        'course_images',
        'course_materials',
        'tutor_usage_metrics',
        'agent_configurations'
    ];
BEGIN
    -- Verificar cada tabla esperada
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT table_exists(table_name) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    -- Reportar resultados
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ TABLAS FALTANTES: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ TODAS LAS TABLAS DEL TUTOR VIRTUAL ESTÁN CREADAS';
    END IF;
END $$;

-- Verificar políticas RLS
DO $$
DECLARE
    missing_policies TEXT[] := ARRAY[]::TEXT[];
    policy_record RECORD;
    expected_policies RECORD[] := ARRAY[
        ROW('tutor_conversations', 'Students can view own conversations'),
        ROW('tutor_conversations', 'Students can create own conversations'),
        ROW('tutor_conversations', 'Students can update own conversations'),
        ROW('tutor_messages', 'Students can view own messages'),
        ROW('tutor_messages', 'Students can create messages in own conversations'),
        ROW('course_pedagogical_settings', 'Teachers can manage course settings'),
        ROW('course_pedagogical_settings', 'Students can view course settings'),
        ROW('course_grading_scales', 'Teachers can manage grading scales'),
        ROW('course_grading_scales', 'Students can view grading scales'),
        ROW('student_learning_profiles', 'Students can manage own profile'),
        ROW('course_images', 'Teachers can manage course images'),
        ROW('course_images', 'Students can view course images'),
        ROW('course_materials', 'Teachers can manage course materials'),
        ROW('course_materials', 'Students can view course materials'),
        ROW('tutor_usage_metrics', 'Students can view own metrics'),
        ROW('tutor_usage_metrics', 'Teachers can view course metrics'),
        ROW('tutor_usage_metrics', 'System can insert metrics'),
        ROW('agent_configurations', 'Teachers can manage agent configurations')
    ];
BEGIN
    -- Verificar cada política esperada
    FOREACH policy_record IN ARRAY expected_policies
    LOOP
        IF NOT policy_exists(policy_record.f1, policy_record.f2) THEN
            missing_policies := array_append(missing_policies, 
                policy_record.f1 || '.' || policy_record.f2);
        END IF;
    END LOOP;
    
    -- Reportar resultados
    IF array_length(missing_policies, 1) > 0 THEN
        RAISE NOTICE '❌ POLÍTICAS RLS FALTANTES: %', array_to_string(missing_policies, ', ');
    ELSE
        RAISE NOTICE '✅ TODAS LAS POLÍTICAS RLS ESTÁN CONFIGURADAS';
    END IF;
END $$;

-- Verificar que RLS esté habilitado en todas las tablas
DO $$
DECLARE
    tables_without_rls TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    expected_tables TEXT[] := ARRAY[
        'tutor_conversations',
        'tutor_messages', 
        'course_pedagogical_settings',
        'course_grading_scales',
        'student_learning_profiles',
        'course_images',
        'course_materials',
        'tutor_usage_metrics',
        'agent_configurations'
    ];
BEGIN
    -- Verificar RLS en cada tabla
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF table_exists(table_name) AND NOT rls_enabled(table_name) THEN
            tables_without_rls := array_append(tables_without_rls, table_name);
        END IF;
    END LOOP;
    
    -- Reportar resultados
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE NOTICE '❌ TABLAS SIN RLS HABILITADO: %', array_to_string(tables_without_rls, ', ');
    ELSE
        RAISE NOTICE '✅ RLS HABILITADO EN TODAS LAS TABLAS';
    END IF;
END $$;

-- Verificar índices importantes
DO $$
DECLARE
    missing_indexes TEXT[] := ARRAY[]::TEXT[];
    index_name TEXT;
    expected_indexes TEXT[] := ARRAY[
        'idx_tutor_conversations_student',
        'idx_tutor_conversations_course',
        'idx_tutor_messages_conversation',
        'idx_student_profiles_lookup',
        'idx_course_grading_scales_course',
        'idx_course_images_course',
        'idx_course_materials_course',
        'idx_tutor_metrics_conversation',
        'idx_agent_configs_course'
    ];
BEGIN
    -- Verificar cada índice esperado
    FOREACH index_name IN ARRAY expected_indexes
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = index_name
        ) THEN
            missing_indexes := array_append(missing_indexes, index_name);
        END IF;
    END LOOP;
    
    -- Reportar resultados
    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE NOTICE '❌ ÍNDICES FALTANTES: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✅ TODOS LOS ÍNDICES ESTÁN CREADOS';
    END IF;
END $$;

-- Verificar estructura de tablas críticas
DO $$
DECLARE
    table_info RECORD;
    expected_columns RECORD;
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Verificar columnas críticas en tutor_conversations
    FOR expected_columns IN 
        SELECT 'tutor_conversations' as table_name, 'student_id' as column_name
        UNION SELECT 'tutor_conversations', 'course_id'
        UNION SELECT 'tutor_conversations', 'started_at'
        UNION SELECT 'tutor_conversations', 'last_activity_at'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = expected_columns.table_name 
            AND column_name = expected_columns.column_name
        ) THEN
            missing_columns := array_append(missing_columns, 
                expected_columns.table_name || '.' || expected_columns.column_name);
        END IF;
    END LOOP;
    
    -- Verificar columnas críticas en course_pedagogical_settings
    FOR expected_columns IN 
        SELECT 'course_pedagogical_settings' as table_name, 'teaching_style' as column_name
        UNION SELECT 'course_pedagogical_settings', 'tone_preference'
        UNION SELECT 'course_pedagogical_settings', 'voice_name'
        UNION SELECT 'course_pedagogical_settings', 'voice_speed'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = expected_columns.table_name 
            AND column_name = expected_columns.column_name
        ) THEN
            missing_columns := array_append(missing_columns, 
                expected_columns.table_name || '.' || expected_columns.column_name);
        END IF;
    END LOOP;
    
    -- Reportar resultados
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE '❌ COLUMNAS FALTANTES: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ TODAS LAS COLUMNAS CRÍTICAS ESTÁN PRESENTES';
    END IF;
END $$;

-- Resumen final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VALIDACIÓN COMPLETA DEL SISTEMA TUTOR VIRTUAL';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Si todos los mensajes anteriores muestran ✅,';
    RAISE NOTICE 'el sistema está correctamente configurado.';
    RAISE NOTICE 'Si hay mensajes ❌, revisa los scripts anteriores.';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
END $$;

-- Limpiar funciones temporales
DROP FUNCTION IF EXISTS table_exists(TEXT);
DROP FUNCTION IF EXISTS policy_exists(TEXT, TEXT);
DROP FUNCTION IF EXISTS rls_enabled(TEXT);
