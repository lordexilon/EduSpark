-- =====================================================
-- SOLUCIÓN DRÁSTICA: Deshabilitar RLS temporalmente
-- =====================================================

-- Deshabilitar RLS en processed_documents
ALTER TABLE processed_documents DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en document_course_assignments  
ALTER TABLE document_course_assignments DISABLE ROW LEVEL SECURITY;

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '⚠️  RLS DESHABILITADO en processed_documents';
    RAISE NOTICE '⚠️  RLS DESHABILITADO en document_course_assignments';
    RAISE NOTICE '⚠️  TODOS los usuarios pueden ver y modificar TODOS los documentos';
    RAISE NOTICE '⚠️  Esto es TEMPORAL para debugging';
END $$;
