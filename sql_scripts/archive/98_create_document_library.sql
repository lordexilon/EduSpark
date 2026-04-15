-- =====================================================
-- Sistema de Biblioteca de Documentos y Asignación Múltiple
-- Permite que documentos procesados sean asignados a múltiples cursos
-- =====================================================

-- 1. TABLA: processed_documents
-- Biblioteca centralizada de documentos procesados por institución
CREATE TABLE IF NOT EXISTS processed_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    total_chunks INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE processed_documents IS 'Biblioteca centralizada de documentos procesados por institución';
COMMENT ON COLUMN processed_documents.institution_id IS 'Institución propietaria del documento';
COMMENT ON COLUMN processed_documents.total_chunks IS 'Número total de chunks generados del documento';
COMMENT ON COLUMN processed_documents.processing_status IS 'Estado del procesamiento: pending, processing, completed, failed';

-- 2. TABLA: document_course_assignments
-- Relación many-to-many entre documentos y cursos
CREATE TABLE IF NOT EXISTS document_course_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES processed_documents(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    UNIQUE(document_id, course_id)
);

COMMENT ON TABLE document_course_assignments IS 'Asignación de documentos a cursos (many-to-many)';
COMMENT ON COLUMN document_course_assignments.assigned_by IS 'Usuario que realizó la asignación';
COMMENT ON COLUMN document_course_assignments.notes IS 'Notas sobre la asignación';

-- 3. MODIFICAR: course_content_chunks
-- Agregar referencia a documento y índice de chunk
ALTER TABLE course_content_chunks 
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES processed_documents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS chunk_index INTEGER;

COMMENT ON COLUMN course_content_chunks.document_id IS 'Documento al que pertenece este chunk';
COMMENT ON COLUMN course_content_chunks.chunk_index IS 'Índice del chunk dentro del documento';

-- 4. ÍNDICES para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_processed_documents_institution ON processed_documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_processed_documents_status ON processed_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_document_assignments_document ON document_course_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_course ON document_course_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON course_content_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_index ON course_content_chunks(document_id, chunk_index);

-- 5. TRIGGER para updated_at
CREATE OR REPLACE FUNCTION update_processed_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_processed_documents_updated_at
    BEFORE UPDATE ON processed_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_processed_documents_updated_at();

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_course_assignments ENABLE ROW LEVEL SECURITY;

-- Política: Admin puede gestionar todos los documentos
CREATE POLICY "admins_manage_all_documents" ON processed_documents
FOR ALL USING (is_admin());

-- Política: Admin-campus puede gestionar documentos de su institución
CREATE POLICY "admin_campus_manage_institution_documents" ON processed_documents
FOR ALL USING (
    is_admin_campus() AND institution_id = get_user_institution_id()
);

-- Política: Coordinadores pueden ver documentos de su institución
CREATE POLICY "coordinators_view_institution_documents" ON processed_documents
FOR SELECT USING (
    is_admin_or_coordinator() AND institution_id = get_user_institution_id()
);

-- Política: Docentes pueden ver documentos asignados a sus cursos
CREATE POLICY "teachers_view_assigned_documents" ON processed_documents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM document_course_assignments dca
        JOIN courses c ON c.id = dca.course_id
        WHERE dca.document_id = processed_documents.id
        AND c.teacher_id = auth.uid()
    )
);

-- Políticas para document_course_assignments
CREATE POLICY "admins_manage_all_assignments" ON document_course_assignments
FOR ALL USING (is_admin());

CREATE POLICY "admin_campus_manage_institution_assignments" ON document_course_assignments
FOR ALL USING (
    is_admin_campus() AND 
    EXISTS (
        SELECT 1 FROM processed_documents pd
        WHERE pd.id = document_course_assignments.document_id
        AND pd.institution_id = get_user_institution_id()
    )
);

CREATE POLICY "coordinators_manage_institution_assignments" ON document_course_assignments
FOR ALL USING (
    is_admin_or_coordinator() AND 
    EXISTS (
        SELECT 1 FROM processed_documents pd
        WHERE pd.id = document_course_assignments.document_id
        AND pd.institution_id = get_user_institution_id()
    )
);

CREATE POLICY "teachers_view_course_assignments" ON document_course_assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = document_course_assignments.course_id
        AND c.teacher_id = auth.uid()
    )
);

-- 7. FUNCIÓN HELPER: Obtener documentos asignados a un curso
CREATE OR REPLACE FUNCTION get_course_documents(p_course_id INTEGER)
RETURNS TABLE (
    document_id UUID,
    title VARCHAR(255),
    description TEXT,
    file_type VARCHAR(50),
    total_chunks INTEGER,
    assigned_at TIMESTAMPTZ,
    assigned_by_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.id,
        pd.title,
        pd.description,
        pd.file_type,
        pd.total_chunks,
        dca.assigned_at,
        CONCAT(u.first_name, ' ', u.last_name) as assigned_by_name
    FROM processed_documents pd
    JOIN document_course_assignments dca ON dca.document_id = pd.id
    LEFT JOIN users u ON u.id = dca.assigned_by
    WHERE dca.course_id = p_course_id
    ORDER BY dca.assigned_at DESC;
END;
$$;

COMMENT ON FUNCTION get_course_documents IS 'Obtiene todos los documentos asignados a un curso';

-- 8. FUNCIÓN HELPER: Obtener cursos asignados a un documento
CREATE OR REPLACE FUNCTION get_document_courses(p_document_id UUID)
RETURNS TABLE (
    course_id INTEGER,
    course_title VARCHAR(255),
    course_code VARCHAR(50),
    assigned_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.code,
        dca.assigned_at
    FROM courses c
    JOIN document_course_assignments dca ON dca.course_id = c.id
    WHERE dca.document_id = p_document_id
    ORDER BY dca.assigned_at DESC;
END;
$$;

COMMENT ON FUNCTION get_document_courses IS 'Obtiene todos los cursos a los que está asignado un documento';

-- 9. GRANT permisos
GRANT EXECUTE ON FUNCTION get_course_documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_courses TO authenticated;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Tablas creadas: processed_documents, document_course_assignments';
    RAISE NOTICE '✅ Columnas agregadas a course_content_chunks: document_id, chunk_index';
    RAISE NOTICE '✅ Índices creados para optimización';
    RAISE NOTICE '✅ Políticas RLS implementadas';
    RAISE NOTICE '✅ Funciones helper creadas';
END $$;
