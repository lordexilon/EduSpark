-- =====================================================
-- VISOR PDF SEGURO - Configuración Compatible con Supabase
-- Versión V2 - Sin errores de permisos
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICACIÓN PREVIA
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN PREVIA - Bucket materials';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    id, 
    name, 
    public, 
    file_size_limit,
    CASE 
        WHEN public = true THEN '⚠️ PÚBLICO (se cambiará a privado)'
        WHEN public = false THEN '✅ PRIVADO (correcto)'
        ELSE '❓ Desconocido'
    END as status
FROM storage.buckets 
WHERE id = 'materials';

-- =====================================================
-- PASO 2: CREAR O ACTUALIZAR BUCKET
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONFIGURANDO BUCKET MATERIALS';
    RAISE NOTICE '========================================';
END $$;

-- Crear bucket solo si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,  -- IMPORTANTE: Forzar a privado
  file_size_limit = GREATEST(EXCLUDED.file_size_limit, storage.buckets.file_size_limit);

-- Verificar resultado
SELECT 
    id, 
    name, 
    public, 
    file_size_limit,
    CASE 
        WHEN public = false AND file_size_limit >= 52428800 THEN '✅ CONFIGURADO CORRECTAMENTE'
        ELSE '⚠️ REVISAR CONFIGURACIÓN'
    END as status
FROM storage.buckets 
WHERE id = 'materials';

-- =====================================================
-- PASO 3: POLÍTICAS RLS (sin ALTER TABLE)
-- RLS ya está habilitado por defecto en Supabase
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONFIGURANDO POLÍTICAS RLS';
    RAISE NOTICE '========================================';
END $$;

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "PDF Secure: Read materials" ON storage.objects;
DROP POLICY IF EXISTS "PDF Secure: Upload materials" ON storage.objects;
DROP POLICY IF EXISTS "PDF Secure: Update own materials" ON storage.objects;
DROP POLICY IF EXISTS "PDF Secure: Delete own materials" ON storage.objects;

-- POLÍTICA 1: Lectura para usuarios autenticados
CREATE POLICY "PDF Secure: Read materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'materials');

-- POLÍTICA 2: Subida solo para profesores y admins
CREATE POLICY "PDF Secure: Upload materials"
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

-- POLÍTICA 3: Actualización solo del propietario
CREATE POLICY "PDF Secure: Update own materials"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'materials' AND
  owner = auth.uid()
);

-- POLÍTICA 4: Eliminación por propietario o admin
CREATE POLICY "PDF Secure: Delete own materials"
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

-- Verificar políticas creadas
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'POLÍTICAS RLS CREADAS';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%PDF Secure%'
ORDER BY policyname;

-- =====================================================
-- PASO 4: TABLA DE AUDIT LOG (OPCIONAL)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREANDO TABLA DE AUDIT LOG';
    RAISE NOTICE '========================================';
END $$;

-- Crear tabla solo si no existe
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

-- Crear índices si no existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_material_access_log_user_id'
    ) THEN
        CREATE INDEX idx_material_access_log_user_id ON material_access_log(user_id);
        RAISE NOTICE 'Índice idx_material_access_log_user_id creado';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_material_access_log_material_id'
    ) THEN
        CREATE INDEX idx_material_access_log_material_id ON material_access_log(material_id);
        RAISE NOTICE 'Índice idx_material_access_log_material_id creado';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_material_access_log_accessed_at'
    ) THEN
        CREATE INDEX idx_material_access_log_accessed_at ON material_access_log(accessed_at);
        RAISE NOTICE 'Índice idx_material_access_log_accessed_at creado';
    END IF;
END $$;

-- Habilitar RLS en la nueva tabla
ALTER TABLE material_access_log ENABLE ROW LEVEL SECURITY;

-- Políticas para audit log
DROP POLICY IF EXISTS "Admins view all logs" ON material_access_log;
CREATE POLICY "Admins view all logs"
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

DROP POLICY IF EXISTS "Users view own logs" ON material_access_log;
CREATE POLICY "Users view own logs"
ON material_access_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can log access" ON material_access_log;
CREATE POLICY "Users can log access"
ON material_access_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PASO 5: FUNCIÓN PARA REGISTRAR ACCESO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREANDO FUNCIONES AUXILIARES';
    RAISE NOTICE '========================================';
END $$;

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

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
-- PASO 6: VISTA DE REPORTE
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

-- Dar permisos
GRANT SELECT ON material_access_report TO authenticated;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL';
    RAISE NOTICE '========================================';
END $$;

-- 1. Verificar bucket
SELECT 
    '✅ Bucket configurado' as check_item,
    id, 
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'materials'
  AND public = false
  AND file_size_limit >= 52428800;

-- 2. Contar políticas creadas
SELECT 
    '✅ Políticas RLS' as check_item,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%PDF Secure%';

-- 3. Verificar tabla audit log
SELECT 
    '✅ Tabla audit log' as check_item,
    CASE 
        WHEN COUNT(*) > 0 THEN 'Creada'
        ELSE 'No existe'
    END as status
FROM information_schema.tables 
WHERE table_name = 'material_access_log';

-- 4. Verificar función
SELECT 
    '✅ Función log_material_access' as check_item,
    CASE 
        WHEN COUNT(*) > 0 THEN 'Creada'
        ELSE 'No existe'
    END as status
FROM pg_proc 
WHERE proname = 'log_material_access';

-- =====================================================
-- RESULTADO FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos pasos:';
    RAISE NOTICE '1. Verificar que las 4 políticas RLS se crearon';
    RAISE NOTICE '2. Probar el visor PDF con un documento de prueba';
    RAISE NOTICE '3. (Opcional) Implementar audit log en el frontend';
    RAISE NOTICE '';
    RAISE NOTICE 'Documentación:';
    RAISE NOTICE '- AI_CONTEXT/03_GUIAS/GUIA_RAPIDA_VISOR_PDF_SEGURO.md';
    RAISE NOTICE '- AI_CONTEXT/README_VISOR_PDF.md';
    RAISE NOTICE '========================================';
END $$;
