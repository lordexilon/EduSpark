-- =====================================================
-- RE-HABILITAR RLS CON POLÍTICAS SIMPLIFICADAS
-- =====================================================

-- 0. Crear función helper para verificar admin (con SECURITY DEFINER para evitar recursión)
-- IMPORTANTE: Estas funciones deben usar SECURITY DEFINER y evitar consultar tablas con RLS
-- Usamos SET LOCAL para deshabilitar temporalmente RLS durante la consulta
CREATE OR REPLACE FUNCTION public.is_admin_safe()
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
  
  RETURN COALESCE(v_role_name = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error (posible recursión), retornar false por seguridad
    RETURN false;
END;
$$;

-- Función helper para obtener institución del usuario (con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_user_institution_id()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_institution_id INTEGER;
BEGIN
  -- Deshabilitar temporalmente RLS para esta consulta
  SET LOCAL row_security = off;
  
  -- Consultar directamente sin activar RLS
  SELECT institution_id INTO v_institution_id
  FROM public.user_institutions 
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
  
  RETURN v_institution_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error (posible recursión), retornar NULL
    RETURN NULL;
END;
$$;

-- 1. Habilitar RLS nuevamente
ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_course_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas existentes (incluyendo las de otros scripts)
-- Esto es crítico para evitar conflictos y recursión
DROP POLICY IF EXISTS "admin_all_access_docs" ON processed_documents;
DROP POLICY IF EXISTS "allow_all_read_docs" ON processed_documents;
DROP POLICY IF EXISTS "admin_full_access_docs" ON processed_documents;
DROP POLICY IF EXISTS "view_institution_docs" ON processed_documents;
DROP POLICY IF EXISTS "admins_manage_all_documents" ON processed_documents;
DROP POLICY IF EXISTS "admin_campus_manage_institution_documents" ON processed_documents;
DROP POLICY IF EXISTS "coordinators_view_institution_documents" ON processed_documents;
DROP POLICY IF EXISTS "teachers_view_assigned_documents" ON processed_documents;
DROP POLICY IF EXISTS "supervisors_view_institution_documents" ON processed_documents;
DROP POLICY IF EXISTS "allow_all_read" ON processed_documents;
DROP POLICY IF EXISTS "admin_all_access" ON processed_documents;

DROP POLICY IF EXISTS "admin_all_access_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "allow_all_read_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "admin_full_access_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "view_institution_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "admins_manage_all_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "admin_campus_manage_institution_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "coordinators_manage_institution_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "teachers_view_course_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "supervisors_view_institution_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "allow_all_read_assignments" ON document_course_assignments;
DROP POLICY IF EXISTS "admin_all_access_assignments" ON document_course_assignments;

-- 3. Políticas para processed_documents

-- ADMIN: Acceso total (usa función helper para evitar recursión)
DROP POLICY IF EXISTS "admin_full_access_docs" ON processed_documents;
CREATE POLICY "admin_full_access_docs"
ON processed_documents
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

-- LECTURA: Permitir ver documentos de la misma institución
-- Usa función helper para evitar recursión con user_institutions

DROP POLICY IF EXISTS "view_institution_docs" ON processed_documents;
CREATE POLICY "view_institution_docs"
ON processed_documents
FOR SELECT
TO authenticated
USING (
  institution_id = public.get_user_institution_id()
  OR public.is_admin_safe()
);

-- 4. Políticas para document_course_assignments

-- ADMIN: Acceso total (usa función helper para evitar recursión)
DROP POLICY IF EXISTS "admin_full_access_assignments" ON document_course_assignments;
CREATE POLICY "admin_full_access_assignments"
ON document_course_assignments
FOR ALL
TO authenticated
USING (public.is_admin_safe())
WITH CHECK (public.is_admin_safe());

-- LECTURA: Ver asignaciones de cursos de mi institución
-- Simplificado para evitar recursión: verifica directamente institution_id del curso
DROP POLICY IF EXISTS "view_institution_assignments" ON document_course_assignments;
CREATE POLICY "view_institution_assignments"
ON document_course_assignments
FOR SELECT
TO authenticated
USING (
  public.is_admin_safe()
  OR EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = document_course_assignments.course_id
    AND c.institution_id = public.get_user_institution_id()
  )
);

-- Notificación
DO $$
BEGIN
    RAISE NOTICE 'RLS Re-habilitado con politicas simplificadas';
END $$;
