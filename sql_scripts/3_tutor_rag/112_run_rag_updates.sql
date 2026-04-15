-- =====================================================
-- SCRIPT MAESTRO DE ACTUALIZACIÓN RAG (MULTI-CURSO)
-- Ejecuta todas las actualizaciones necesarias para RAG
-- =====================================================

-- 1. Actualizar funciones de búsqueda (Vectorial, Texto, Híbrida)
\ir 110_update_rag_search_functions.sql

-- 2. Crear RPC para búsqueda por rango de páginas
\ir 111_create_page_range_search_rpc.sql

-- 3. Verificación
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ Actualización de funciones RAG completada';
    RAISE NOTICE '✅ Soporte para documentos asignados habilitado';
    RAISE NOTICE '==========================================';
END $$;
