-- =====================================================
-- Script 09: Limpieza de Datos del Tutor Virtual
-- Elimina datos de ejemplo y resetea el sistema
-- =====================================================

-- Función para confirmar limpieza
DO $$
DECLARE
    response TEXT;
BEGIN
    RAISE NOTICE '⚠️  ADVERTENCIA: Este script eliminará TODOS los datos del tutor virtual.';
    RAISE NOTICE 'Esto incluye:';
    RAISE NOTICE '- Todas las conversaciones y mensajes';
    RAISE NOTICE '- Todas las configuraciones pedagógicas';
    RAISE NOTICE '- Todos los perfiles de estudiantes';
    RAISE NOTICE '- Todas las escalas de calificación';
    RAISE NOTICE '- Todas las imágenes y materiales';
    RAISE NOTICE '- Todas las métricas y configuraciones de agentes';
    RAISE NOTICE '';
    RAISE NOTICE '¿Estás seguro de que quieres continuar? (Escribe "CONFIRMAR" para continuar)';
    
    -- En un entorno real, aquí se pediría confirmación del usuario
    -- Por ahora, solo mostramos el mensaje
    RAISE NOTICE 'Para continuar, ejecuta: DELETE FROM tutor_usage_metrics; etc.';
    RAISE NOTICE 'O ejecuta este script completo si estás seguro.';
END $$;

-- Eliminar datos en orden correcto (respetando foreign keys)
DO $$
BEGIN
    RAISE NOTICE '🧹 Iniciando limpieza de datos del tutor virtual...';

    -- 1. Eliminar métricas de uso
    DELETE FROM tutor_usage_metrics;
    RAISE NOTICE '✅ Métricas de uso eliminadas';

    -- 2. Eliminar mensajes
    DELETE FROM tutor_messages;
    RAISE NOTICE '✅ Mensajes eliminados';

    -- 3. Eliminar conversaciones
    DELETE FROM tutor_conversations;
    RAISE NOTICE '✅ Conversaciones eliminadas';

    -- 4. Eliminar configuraciones de agentes
    DELETE FROM agent_configurations;
    RAISE NOTICE '✅ Configuraciones de agentes eliminadas';

    -- 5. Eliminar imágenes de curso
    DELETE FROM course_images;
    RAISE NOTICE '✅ Imágenes de curso eliminadas';

    -- 6. Eliminar materiales de curso
    DELETE FROM course_materials;
    RAISE NOTICE '✅ Materiales de curso eliminados';

    -- 7. Eliminar perfiles de estudiantes
    DELETE FROM student_learning_profiles;
    RAISE NOTICE '✅ Perfiles de estudiantes eliminados';

    -- 8. Eliminar escalas de calificación
    DELETE FROM course_grading_scales;
    RAISE NOTICE '✅ Escalas de calificación eliminadas';

    -- 9. Eliminar configuraciones pedagógicas
    DELETE FROM course_pedagogical_settings;
    RAISE NOTICE '✅ Configuraciones pedagógicas eliminadas';

    RAISE NOTICE '';
    RAISE NOTICE '🎉 Limpieza completada exitosamente';
    RAISE NOTICE 'Todas las tablas del tutor virtual están vacías';
    RAISE NOTICE 'Puedes ejecutar el script 08 para insertar datos de ejemplo nuevamente';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error durante la limpieza: %', SQLERRM;
        RAISE NOTICE 'Algunos datos pueden no haberse eliminado correctamente';
END $$;

-- Verificar que las tablas están vacías
DO $$
DECLARE
    table_name TEXT;
    record_count INTEGER;
    tables_to_check TEXT[] := ARRAY[
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
    RAISE NOTICE '';
    RAISE NOTICE '📊 Verificando limpieza...';
    
    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || table_name INTO record_count;
        
        IF record_count = 0 THEN
            RAISE NOTICE '✅ %: vacía', table_name;
        ELSE
            RAISE NOTICE '⚠️  %: % registros restantes', table_name, record_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Limpieza verificada. Si hay registros restantes,';
    RAISE NOTICE 'puede ser debido a restricciones de foreign key.';
END $$;
