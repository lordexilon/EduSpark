-- ================================================================
-- FIX: Permisos RLS para Desktop Uploader (Teachers/Admins)
-- Fecha: 2026-02-10
-- Objetivo: Permitir que usuarios autenticados (Docentes) puedan subir
-- documentos y chunks desde la aplicación de escritorio.
-- ================================================================

-- 1. Habilitar INSERT en processed_documents para usuarios autenticados
-- (Asumiendo que si están autenticados pueden subir documentos)
DROP POLICY IF EXISTS "authenticated_insert_documents" ON processed_documents;

CREATE POLICY "authenticated_insert_documents" ON processed_documents
FOR INSERT 
TO authenticated
WITH CHECK (
    auth.uid() = processed_by
);

-- 2. Habilitar INSERT en course_content_chunks para usuarios autenticados
-- (Necesario para guardar los vectores)
DROP POLICY IF EXISTS "authenticated_insert_chunks" ON course_content_chunks;

CREATE POLICY "authenticated_insert_chunks" ON course_content_chunks
FOR INSERT 
TO authenticated
WITH CHECK (
    -- Verificar que el usuario tenga acceso al curso (opcional, pero recomendado)
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_content_chunks.course_id
        -- Permitir si es el profesor del curso o si es admin
        AND (c.teacher_id = auth.uid() OR public.is_admin() OR public.is_admin_campus())
    )
);

-- 3. Habilitar INSERT en document_course_assignments
DROP POLICY IF EXISTS "authenticated_insert_assignments" ON document_course_assignments;

CREATE POLICY "authenticated_insert_assignments" ON document_course_assignments
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = assigned_by
);

-- 4. Asegurar que course_content_chunks tenga RLS habilitado pero con políticas de lectura correctas
ALTER TABLE course_content_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_chunks" ON course_content_chunks;

CREATE POLICY "authenticated_select_chunks" ON course_content_chunks
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_content_chunks.course_id
        AND (c.teacher_id = auth.uid() OR public.is_admin() OR public.is_admin_campus())
    )
);

-- 5. Verificar public.documents (si existiera residuos, ignorar, nos centramos en processed_documents)

-- Notificar
DO $$
BEGIN
    RAISE NOTICE '✅ Políticas RLS actualizadas para permitir carga desde Desktop Uploader';
END $$;
