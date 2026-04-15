-- =====================================================
-- VERIFICACIÓN: Sistema de Retroalimentación
-- Verificar que todas las tablas, funciones y políticas están creadas
-- =====================================================

-- 1. Verificar que la tabla existe
SELECT 
    'Tabla tutor_general_knowledge_responses' as elemento,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'tutor_general_knowledge_responses'
        ) THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado;

-- 2. Verificar columnas de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tutor_general_knowledge_responses'
ORDER BY ordinal_position;

-- 3. Verificar índices
SELECT 
    indexname as nombre_indice,
    tablename as tabla
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tutor_general_knowledge_responses'
ORDER BY indexname;

-- 4. Verificar funciones
SELECT 
    'get_pending_feedback_responses' as funcion,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'get_pending_feedback_responses'
        ) THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado
UNION ALL
SELECT 
    'mark_feedback_responses_processed' as funcion,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'mark_feedback_responses_processed'
        ) THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado;

-- 5. Verificar políticas RLS
SELECT 
    policyname as nombre_politica,
    cmd as comando,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'tutor_general_knowledge_responses'
            AND policyname = p.policyname
        ) THEN '✅ ACTIVA'
        ELSE '❌ NO ACTIVA'
    END as estado
FROM pg_policies p
WHERE schemaname = 'public'
  AND tablename = 'tutor_general_knowledge_responses';

-- 6. Verificar vista de estadísticas
SELECT 
    'Vista feedback_responses_stats' as elemento,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'feedback_responses_stats'
        ) THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado;

-- 7. Probar función get_pending_feedback_responses (debe retornar vacío si no hay datos)
SELECT * FROM get_pending_feedback_responses(NULL, 10);

-- 8. Verificar RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'tutor_general_knowledge_responses';

-- 9. Contar registros actuales (debe ser 0 al inicio)
SELECT 
    status,
    COUNT(*) as cantidad
FROM tutor_general_knowledge_responses
GROUP BY status
ORDER BY status;

-- 10. Resumen de verificación
SELECT 
    '✅ VERIFICACIÓN COMPLETA' as mensaje,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutor_general_knowledge_responses')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_pending_feedback_responses')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_feedback_responses_processed')
        AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'feedback_responses_stats')
        THEN '✅ Sistema de retroalimentación listo para usar'
        ELSE '❌ Faltan componentes, revisar errores arriba'
    END as estado_final;
