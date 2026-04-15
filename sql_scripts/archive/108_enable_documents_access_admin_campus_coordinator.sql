-- =====================================================
-- PERMITIR ACCESO A DOCUMENTOS PARA ADMIN-CAMPUS Y COORDINATOR
-- =====================================================
-- Este script actualiza las políticas RLS para que admin-campus
-- y coordinator puedan ver y gestionar documentos en /admin/documents

-- 1. Crear funciones helper seguras (si no existen) para admin-campus y coordinator
-- Usando el mismo patrón seguro que is_admin_safe() para evitar recursión

CREATE OR REPLACE FUNCTION public.is_admin_campus_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Deshabilitar temporalmente RLS para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente sin activar RLS
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(v_role_name = 'admin-campus', false);
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error (posible recursión), retornar false por seguridad
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Deshabilitar temporalmente RLS para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente sin activar RLS
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(v_role_name = 'coordinator', false);
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error (posible recursión), retornar false por seguridad
    RETURN false;
END;
$$;

-- Función helper para verificar si es admin, admin-campus o coordinator
CREATE OR REPLACE FUNCTION public.is_admin_or_manager_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Deshabilitar temporalmente RLS para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente sin activar RLS
  SELECT r.name INTO v_role_name
  FROM public.users u 
  JOIN public.roles r ON u.role_id = r.id 
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(v_role_name IN ('admin', 'admin-campus', 'coordinator'), false);
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error (posible recursión), retornar false por seguridad
    RETURN false;
END;
$$;

-- 2. Actualizar políticas para processed_documents

-- ADMIN, ADMIN-CAMPUS y COORDINATOR: Acceso total (admin ve todo, otros ven de su institución)
DROP POLICY IF EXISTS "admin_full_access_docs" ON processed_documents;
CREATE POLICY "admin_full_access_docs"
ON processed_documents
FOR ALL
TO authenticated
USING (
  public.is_admin_safe() 
  OR (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id())
  OR (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id())
)
WITH CHECK (
  public.is_admin_safe() 
  OR (public.is_admin_campus_safe() AND institution_id = public.get_user_institution_id())
  OR (public.is_coordinator_safe() AND institution_id = public.get_user_institution_id())
);

-- LECTURA: Permitir ver documentos de la misma institución o si es admin
DROP POLICY IF EXISTS "view_institution_docs" ON processed_documents;
CREATE POLICY "view_institution_docs"
ON processed_documents
FOR SELECT
TO authenticated
USING (
  public.is_admin_safe()
  OR institution_id = public.get_user_institution_id()
);

-- 3. Actualizar políticas para document_course_assignments

-- ADMIN, ADMIN-CAMPUS y COORDINATOR: Acceso total para asignaciones
DROP POLICY IF EXISTS "admin_full_access_assignments" ON document_course_assignments;
CREATE POLICY "admin_full_access_assignments"
ON document_course_assignments
FOR ALL
TO authenticated
USING (
  public.is_admin_safe()
  OR (
    (public.is_admin_campus_safe() OR public.is_coordinator_safe())
    AND EXISTS (
      SELECT 1 FROM processed_documents pd
      WHERE pd.id = document_course_assignments.document_id
      AND pd.institution_id = public.get_user_institution_id()
    )
  )
)
WITH CHECK (
  public.is_admin_safe()
  OR (
    (public.is_admin_campus_safe() OR public.is_coordinator_safe())
    AND EXISTS (
      SELECT 1 FROM processed_documents pd
      WHERE pd.id = document_course_assignments.document_id
      AND pd.institution_id = public.get_user_institution_id()
    )
  )
);

-- LECTURA: Ver asignaciones de cursos de mi institución
DROP POLICY IF EXISTS "view_institution_assignments" ON document_course_assignments;
CREATE POLICY "view_institution_assignments"
ON document_course_assignments
FOR SELECT
TO authenticated
USING (
  public.is_admin_safe()
  OR EXISTS (
    SELECT 1 FROM courses c
    JOIN processed_documents pd ON pd.id = document_course_assignments.document_id
    WHERE c.id = document_course_assignments.course_id
    AND (c.institution_id = public.get_user_institution_id() 
         OR pd.institution_id = public.get_user_institution_id())
  )
);

-- Notificación
DO $$
BEGIN
    RAISE NOTICE 'Políticas RLS actualizadas para permitir acceso a admin-campus y coordinator';
    RAISE NOTICE '  - Admin: Ve todos los documentos';
    RAISE NOTICE '  - Admin-campus: Ve documentos de su institución';
    RAISE NOTICE '  - Coordinator: Ve documentos de su institución';
END $$;

