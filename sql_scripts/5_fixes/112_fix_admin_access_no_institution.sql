-- =====================================================
-- FIX: Admin debe ver todos los documentos sin necesidad de institution_id
-- =====================================================
-- El admin no necesita tener institution_id asignado para ver todos los documentos

-- 1. Actualizar política de acceso completo para admin
-- Admin puede ver y gestionar TODOS los documentos sin necesidad de institution_id
DROP POLICY IF EXISTS "admin_full_access_docs" ON processed_documents;
CREATE POLICY "admin_full_access_docs"
ON processed_documents
FOR ALL
TO authenticated
USING (
  -- Admin puede ver todo sin necesidad de institution_id
  public.is_admin_safe() 
  OR 
  -- Admin-campus y coordinator necesitan institution_id y solo ven de su institución
  (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id())
  OR 
  (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id())
)
WITH CHECK (
  -- Admin puede crear/actualizar todo sin necesidad de institution_id
  public.is_admin_safe() 
  OR 
  -- Admin-campus y coordinator solo pueden crear/actualizar documentos de su institución
  (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id())
  OR 
  (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id())
);

-- 2. Actualizar política de lectura para que admin vea todo
-- Esta política es redundante pero asegura que admin siempre pueda leer
DROP POLICY IF EXISTS "view_institution_docs" ON processed_documents;
CREATE POLICY "view_institution_docs"
ON processed_documents
FOR SELECT
TO authenticated
USING (
  -- Admin ve todo sin necesidad de institution_id
  public.is_admin_safe()
  OR 
  -- Otros roles ven documentos de su institución
  (institution_id = public.get_user_institution_id() AND public.get_user_institution_id() IS NOT NULL)
);

-- 3. Actualizar políticas para document_course_assignments
-- Admin puede gestionar todas las asignaciones sin necesidad de institution_id
DROP POLICY IF EXISTS "admin_full_access_assignments" ON document_course_assignments;
CREATE POLICY "admin_full_access_assignments"
ON document_course_assignments
FOR ALL
TO authenticated
USING (
  -- Admin puede ver/gestionar todas las asignaciones
  public.is_admin_safe()
  OR 
  -- Admin-campus y coordinator solo ven/gestionan asignaciones de documentos de su institución
  (
    (public.is_admin_campus_safe() OR public.is_coordinator_safe())
    AND EXISTS (
      SELECT 1 FROM processed_documents pd
      WHERE pd.id = document_course_assignments.document_id
      AND pd.institution_id = public.get_user_institution_id()
      AND public.get_user_institution_id() IS NOT NULL
    )
  )
)
WITH CHECK (
  -- Admin puede crear/actualizar todas las asignaciones
  public.is_admin_safe()
  OR 
  -- Admin-campus y coordinator solo pueden crear/actualizar asignaciones de documentos de su institución
  (
    (public.is_admin_campus_safe() OR public.is_coordinator_safe())
    AND EXISTS (
      SELECT 1 FROM processed_documents pd
      WHERE pd.id = document_course_assignments.document_id
      AND pd.institution_id = public.get_user_institution_id()
      AND public.get_user_institution_id() IS NOT NULL
    )
  )
);

-- 4. Actualizar política de lectura para asignaciones
DROP POLICY IF EXISTS "view_institution_assignments" ON document_course_assignments;
CREATE POLICY "view_institution_assignments"
ON document_course_assignments
FOR SELECT
TO authenticated
USING (
  -- Admin ve todas las asignaciones
  public.is_admin_safe()
  OR 
  -- Otros roles ven asignaciones de cursos/documentos de su institución
  EXISTS (
    SELECT 1 FROM courses c
    JOIN processed_documents pd ON pd.id = document_course_assignments.document_id
    WHERE c.id = document_course_assignments.course_id
    AND (
      c.institution_id = public.get_user_institution_id() 
      OR pd.institution_id = public.get_user_institution_id()
    )
    AND public.get_user_institution_id() IS NOT NULL
  )
);

-- 5. Verificar que admin puede ver documentos sin institution_id
DO $$
DECLARE
    v_admin_docs_count INTEGER;
BEGIN
    -- Simular como admin (esto solo funciona si estás logueado como admin)
    SELECT COUNT(*) INTO v_admin_docs_count
    FROM processed_documents
    WHERE public.is_admin_safe();
    
    RAISE NOTICE '✅ Políticas actualizadas';
    RAISE NOTICE '   - Admin puede ver todos los documentos sin institution_id';
    RAISE NOTICE '   - Admin-campus y coordinator necesitan institution_id para ver documentos de su institución';
    RAISE NOTICE '   - Documentos visibles para admin: %', v_admin_docs_count;
END $$;

