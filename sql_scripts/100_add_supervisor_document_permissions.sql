-- =====================================================
-- Actualización: Agregar permisos de Supervisor para Biblioteca de Documentos
-- El supervisor puede ver todos los documentos de su institución
-- =====================================================

-- Política: Supervisores pueden ver documentos de su institución
CREATE POLICY "supervisors_view_institution_documents" ON processed_documents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON r.id = u.role_id
        JOIN user_institutions ui ON ui.user_id = u.id
        WHERE u.id = auth.uid()
        AND r.name = 'supervisor'
        AND ui.institution_id = processed_documents.institution_id
    )
);

-- Política: Supervisores pueden ver asignaciones de su institución
CREATE POLICY "supervisors_view_institution_assignments" ON document_course_assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON r.id = u.role_id
        JOIN user_institutions ui ON ui.user_id = u.id
        JOIN processed_documents pd ON pd.id = document_course_assignments.document_id
        WHERE u.id = auth.uid()
        AND r.name = 'supervisor'
        AND ui.institution_id = pd.institution_id
    )
);

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS para supervisor agregadas';
    RAISE NOTICE '✅ Supervisor puede ver documentos de su institución';
    RAISE NOTICE '✅ Supervisor puede ver asignaciones de su institución';
END $$;
