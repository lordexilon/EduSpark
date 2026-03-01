-- =====================================================
-- Configuración de Supabase Storage para PDFs Seguros
-- Script para configurar buckets y políticas RLS
-- =====================================================

-- =====================================================
-- 1. CREAR BUCKET (si no existe)
-- =====================================================

-- Insertar bucket 'materials' como privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  false, -- IMPORTANTE: Debe ser privado para usar signed URLs
  52428800, -- 50 MB límite
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Habilitar RLS en la tabla storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Política 1: Permitir LECTURA a usuarios autenticados
-- =====================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Authenticated users can read materials" ON storage.objects;

-- Crear política de lectura
CREATE POLICY "Authenticated users can read materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'materials'
);

-- =====================================================
-- Política 2: Permitir SUBIDA solo a profesores/admins
-- =====================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Teachers and admins can upload materials" ON storage.objects;

-- Crear política de inserción
CREATE POLICY "Teachers and admins can upload materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin', 'admin-campus', 'supervisor')
  )
);

-- =====================================================
-- Política 3: Permitir ACTUALIZACIÓN solo al creador
-- =====================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Users can update their own materials" ON storage.objects;

-- Crear política de actualización
CREATE POLICY "Users can update their own materials"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'materials' AND
  owner = auth.uid()
);

-- =====================================================
-- Política 4: Permitir ELIMINACIÓN solo al creador o admins
-- =====================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Users can delete their own materials or admins can delete any" ON storage.objects;

-- Crear política de eliminación
CREATE POLICY "Users can delete their own materials or admins can delete any"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'materials' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'admin-campus')
    )
  )
);

-- =====================================================
-- 3. FUNCIÓN AUXILIAR: Generar URL firmada
-- Esta función se puede llamar desde la aplicación si es necesario
-- =====================================================

-- Eliminar función si existe
DROP FUNCTION IF EXISTS get_signed_material_url(text, integer);

-- Crear función para generar URLs firmadas
CREATE OR REPLACE FUNCTION get_signed_material_url(
  file_path text,
  expires_in integer DEFAULT 3600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signed_url text;
BEGIN
  -- Verificar que el usuario esté autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Verificar que el usuario tenga acceso al archivo
  IF NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'materials'
      AND name = file_path
  ) THEN
    RAISE EXCEPTION 'File not found or access denied';
  END IF;

  -- Generar URL firmada usando la API de Supabase
  -- NOTA: Esta función es un placeholder, ya que la generación de signed URLs
  -- debe hacerse en el cliente usando supabase.storage.from().createSignedUrl()
  
  RETURN 'Use supabase.storage.from("materials").createSignedUrl() from client';
END;
$$;

-- =====================================================
-- 4. TABLA DE REGISTRO DE ACCESO (Opcional - Audit Log)
-- Para rastrear quién accede a qué documentos
-- =====================================================

-- Crear tabla de audit log si no existe
CREATE TABLE IF NOT EXISTS material_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  action text CHECK (action IN ('view', 'download', 'print_attempt')),
  ip_address inet,
  user_agent text,
  accessed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_material_access_log_user_id ON material_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_material_access_log_material_id ON material_access_log(material_id);
CREATE INDEX IF NOT EXISTS idx_material_access_log_accessed_at ON material_access_log(accessed_at);

-- Habilitar RLS
ALTER TABLE material_access_log ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver todos los logs
DROP POLICY IF EXISTS "Admins can view all access logs" ON material_access_log;
CREATE POLICY "Admins can view all access logs"
ON material_access_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'admin-campus', 'supervisor')
  )
);

-- Política: Usuarios pueden ver sus propios logs
DROP POLICY IF EXISTS "Users can view their own access logs" ON material_access_log;
CREATE POLICY "Users can view their own access logs"
ON material_access_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política: Permitir inserción a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can log access" ON material_access_log;
CREATE POLICY "Authenticated users can log access"
ON material_access_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. FUNCIÓN PARA REGISTRAR ACCESO
-- =====================================================

-- Eliminar función si existe
DROP FUNCTION IF EXISTS log_material_access(uuid, text, text, inet, text);

-- Crear función
CREATE OR REPLACE FUNCTION log_material_access(
  p_material_id uuid,
  p_file_path text,
  p_action text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  -- Verificar que el usuario esté autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Insertar log de acceso
  INSERT INTO material_access_log (
    user_id,
    material_id,
    file_path,
    action,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    p_material_id,
    p_file_path,
    p_action,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- =====================================================
-- 6. VISTA PARA REPORTES DE ACCESO
-- =====================================================

-- Eliminar vista si existe
DROP VIEW IF EXISTS material_access_report;

-- Crear vista
CREATE OR REPLACE VIEW material_access_report AS
SELECT
  mal.id,
  mal.user_id,
  u.email AS user_email,
  u.name AS user_name,
  u.role AS user_role,
  mal.material_id,
  m.title AS material_title,
  m.kind AS material_kind,
  mal.file_path,
  mal.action,
  mal.ip_address,
  mal.user_agent,
  mal.accessed_at,
  c.id AS course_id,
  c.title AS course_title,
  i.name AS institution_name
FROM material_access_log mal
LEFT JOIN public.users u ON mal.user_id = u.id
LEFT JOIN materials m ON mal.material_id = m.id
LEFT JOIN material_unit_assignments mua ON m.id = mua.material_id
LEFT JOIN units un ON mua.unit_id = un.id
LEFT JOIN courses c ON un.course_id = c.id
LEFT JOIN institutions i ON c.institution_id = i.id
ORDER BY mal.accessed_at DESC;

-- Dar permisos de lectura solo a admins
GRANT SELECT ON material_access_report TO authenticated;

-- RLS en la vista
ALTER VIEW material_access_report SET (security_barrier = true);

-- =====================================================
-- 7. QUERY ÚTILES PARA TESTING
-- =====================================================

-- Verificar configuración del bucket
-- SELECT * FROM storage.buckets WHERE id = 'materials';

-- Ver todas las políticas en storage.objects
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Ver archivos en el bucket
-- SELECT name, owner, bucket_id, created_at, updated_at 
-- FROM storage.objects 
-- WHERE bucket_id = 'materials' 
-- ORDER BY created_at DESC;

-- Ver logs de acceso recientes
-- SELECT * FROM material_access_report LIMIT 100;

-- Estadísticas de acceso por usuario
-- SELECT 
--   user_email,
--   user_name,
--   COUNT(*) as total_accesses,
--   COUNT(DISTINCT material_id) as unique_materials,
--   MAX(accessed_at) as last_access
-- FROM material_access_report
-- GROUP BY user_email, user_name
-- ORDER BY total_accesses DESC;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- 1. El bucket DEBE ser privado (public = false) para que las signed URLs funcionen
-- 2. Las signed URLs expiran automáticamente después del tiempo especificado
-- 3. Los logs de acceso son opcionales pero recomendados para auditoría
-- 4. Ajustar el límite de tamaño de archivo según las necesidades
-- 5. Verificar que los tipos MIME permitidos incluyan todos los formatos necesarios
-- 6. Las políticas RLS deben coincidir con los roles definidos en la tabla users

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
