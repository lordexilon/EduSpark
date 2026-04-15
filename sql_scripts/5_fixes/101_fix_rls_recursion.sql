-- =====================================================
-- FIX: Eliminar políticas RLS problemáticas y crear unas simples
-- =====================================================

-- Eliminar TODAS las políticas existentes de processed_documents
DROP POLICY IF EXISTS "admins_full_access" ON processed_documents;
DROP POLICY IF EXISTS "admin_campus_view_institution" ON processed_documents;
DROP POLICY IF EXISTS "admin_campus_manage_institution" ON processed_documents;
DROP POLICY IF EXISTS "coordinators_view_institution" ON processed_documents;
DROP POLICY IF EXISTS "teachers_view_assigned" ON processed_documents;
DROP POLICY IF EXISTS "supervisors_view_institution_documents" ON processed_documents;

-- Eliminar políticas de document_course_assignments
DROP POLICY IF EXISTS "admins_full_access_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "admin_campus_view_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "admin_campus_manage_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "coordinators_view_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "teachers_view_assigned_courses" ON document_course_assignments;
DROP POLICY IF EXISTS "supervisors_view_institution_assignments" ON document_course_assignments;

-- =====================================================
-- POLÍTICAS SIMPLES SIN RECURSIÓN
-- =====================================================

-- Para processed_documents: TODOS pueden ver TODOS los documentos
-- (Simplificación temporal para resolver el problema)
CREATE POLICY "allow_all_read" ON processed_documents
FOR SELECT USING (true);

-- Admin puede hacer todo
CREATE POLICY "admin_all_access" ON processed_documents
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.id = auth.uid()
        AND r.name = 'admin'
    )
);

-- Para document_course_assignments: TODOS pueden ver
CREATE POLICY "allow_all_read_assignments" ON document_course_assignments
FOR SELECT USING (true);

-- Admin puede hacer todo en assignments
CREATE POLICY "admin_all_access_assignments" ON document_course_assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.id = auth.uid()
        AND r.name = 'admin'
    )
);

-- Verificación
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS simplificadas aplicadas';
    RAISE NOTICE '✅ Todos los usuarios pueden ver documentos (temporal)';
    RAISE NOTICE '✅ Admin tiene acceso completo';
END $$;
