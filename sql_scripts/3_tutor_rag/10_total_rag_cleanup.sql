-- =====================================================
-- Script 10: Limpieza Total para Reprocesamiento RAG
-- Elimina chunks, resetea estados y limpia datos del tutor
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🧹 Iniciando limpieza TOTAL para reprocesamiento RAG...';

    -- 1. Eliminar todos los chunks de contenido (RAG Data)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_content_chunks') THEN
        DELETE FROM public.course_content_chunks;
        RAISE NOTICE '✅ Todos los chunks en course_content_chunks han sido eliminados';
    END IF;

    -- 2. Eliminar historial de trabajos de procesamiento de archivos
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_processing_jobs') THEN
        DELETE FROM public.file_processing_jobs;
        RAISE NOTICE '✅ Todos los registros de file_processing_jobs han sido eliminados';
    END IF;

    -- 3. Resetear el estado RAG en la tabla de materiales
    -- Asumimos que la tabla se llama 'materials' y tiene la columna 'rag_status'
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'materials' AND column_name = 'rag_status') THEN
        UPDATE public.materials 
        SET rag_status = 'pending',
            metadata = metadata - 'ragProcessed' - 'lastProcessedAt' - 'processingError';
        RAISE NOTICE '✅ Estado RAG de todos los materiales reseteado a "pending"';
    END IF;

    -- 3. Limpiar datos de conversaciones y métricas (Misma lógica que el script 09)
    
    -- Eliminar métricas de uso
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tutor_usage_metrics') THEN
        DELETE FROM tutor_usage_metrics;
        RAISE NOTICE '✅ Métricas de uso eliminadas';
    END IF;

    -- Eliminar mensajes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tutor_messages') THEN
        DELETE FROM tutor_messages;
        RAISE NOTICE '✅ Mensajes eliminados';
    END IF;

    -- Eliminar conversaciones
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tutor_conversations') THEN
        DELETE FROM tutor_conversations;
        RAISE NOTICE '✅ Conversaciones eliminadas';
    END IF;

    -- Eliminar configuraciones de agentes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agent_configurations') THEN
        DELETE FROM agent_configurations;
        RAISE NOTICE '✅ Configuraciones de agentes eliminadas';
    END IF;

    -- Eliminar imágenes de curso
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_images') THEN
        DELETE FROM course_images;
        RAISE NOTICE '✅ Imágenes de curso eliminadas';
    END IF;

    -- Eliminar materiales de curso (tutor specific)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_materials') THEN
        DELETE FROM course_materials;
        RAISE NOTICE '✅ Materiales de curso (específicos del tutor) eliminados';
    END IF;

    -- Eliminar perfiles de estudiantes
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'student_learning_profiles') THEN
        DELETE FROM student_learning_profiles;
        RAISE NOTICE '✅ Perfiles de estudiantes eliminados';
    END IF;

    -- Eliminar escalas de calificación
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_grading_scales') THEN
        DELETE FROM course_grading_scales;
        RAISE NOTICE '✅ Escalas de calificación eliminadas';
    END IF;

    -- Eliminar configuraciones pedagógicas
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'course_pedagogical_settings') THEN
        DELETE FROM course_pedagogical_settings;
        RAISE NOTICE '✅ Configuraciones pedagógicas eliminadas';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '🎉 Limpieza TOTAL completada exitosamente';
    RAISE NOTICE 'El sistema está listo para procesar todos los documentos desde cero.';
    RAISE NOTICE 'Usa el script 08 si necesitas restaurar datos de ejemplo del tutor.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error durante la limpieza total: %', SQLERRM;
END $$;
