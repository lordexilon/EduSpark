-- =====================================================
-- VISOR PDF SEGURO - VERSIÓN FINAL
-- Adaptado al esquema REAL de la base de datos
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONFIGURACIÓN VISOR PDF SEGURO - INICIO';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- PASO 1: CONFIGURAR BUCKET MATERIALS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Paso 1: Configurando bucket materials...';
END $$;

-- Crear o actualizar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  false, -- PRIVADO para URLs firmadas
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = GREATEST(EXCLUDED.file_size_limit, storage.buckets.file_size_limit);

-- Verificar
SELECT 
    CASE 
        WHEN public = false AND file_size_limit >= 52428800 
        THEN '✅ Bucket materials: CONFIGURADO CORRECTAMENTE'
        ELSE '⚠️ Bucket materials: REVISAR CONFIGURACIÓN'
    END as status,
    id, public, file_size_limit
FROM storage.buckets 
WHERE id = 'materials';

-- =====================================================
-- PASO 2: POLÍTICAS RLS PARA STORAGE.OBJECTS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Paso 2: Creando políticas RLS...';
END $$;

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "PDF Secure: Read" ON storage.objects;
DROP POLICY IF EXISTS "PDF Secure: Upload" ON storage.objects;
DROP POLICY IF EXISTS "PDF Secure: Update" ON storage.objects;
DROP POLICY IF EXISTS "PDF Secure: Delete" ON storage.objects;

-- Pol 1: Lectura para autenticados
CREATE POLICY "PDF Secure: Read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'materials');

-- Política 2: Subida para profesores/admins
CREATE POLICY "PDF Secure: Upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name IN ('teacher', 'admin', 'admin-campus', 'supervisor')
  )
);

-- Política 3: Actualización por propietario
CREATE POLICY "PDF Secure: Update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'materials' AND owner = auth.uid());

-- Política 4: Eliminación por propietario o admin
CREATE POLICY "PDF Secure: Delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'materials' AND
  (owner = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() AND r.name IN ('admin', 'admin-campus')
  ))
);

-- Verificar
SELECT 
    '✅ Políticas RLS creadas: ' || COUNT(*)::text as status
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%PDF Secure%';

-- =====================================================
-- PASO 3: TABLA DE AUDIT LOG (OPCIONAL - SIMPLIFICADA)
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Paso 3: Creando tabla de audit log (opcional)...';
END $$;

-- Crear tabla solo si no existe
CREATE TABLE IF NOT EXISTS material_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid,  -- Sin FK para evitar dependencias
  file_path text NOT NULL,
  action text CHECK (action IN ('view', 'download', 'print_attempt')),
  ip_address inet,
  user_agent text,
  accessed_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mal_user ON material_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mal_material ON material_access_log(material_id);
CREATE INDEX IF NOT EXISTS idx_mal_accessed ON material_access_log(accessed_at);

-- RLS
ALTER TABLE material_access_log ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "mal_admin_view" ON material_access_log;
CREATE POLICY "mal_admin_view" ON material_access_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid() 
      AND r.name IN ('admin', 'admin-campus', 'supervisor')
  )
);

DROP POLICY IF EXISTS "mal_user_view" ON material_access_log;
CREATE POLICY "mal_user_view" ON material_access_log
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "mal_insert" ON material_access_log;
CREATE POLICY "mal_insert" ON material_access_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PASO 4: FUNCIÓN PARA REGISTRAR ACCESO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Paso 4: Creando función log_material_access...';
END $$;

DROP FUNCTION IF EXISTS log_material_access(uuid, text, text, inet, text);

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
    user_id, material_id, file_path, action, ip_address, user_agent
  )
  VALUES (
    auth.uid(), p_material_id, p_file_path, p_action, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- =====================================================
-- PASO 5: VISTA SIMPLIFICADA DE REPORTE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Paso 5: Creando vista material_access_report...';
END $$;

DROP VIEW IF EXISTS material_access_report;

CREATE OR REPLACE VIEW material_access_report AS
SELECT
  mal.id,
  mal.user_id,
  u.email AS user_email,
  CONCAT(u.first_name, ' ', u.last_name) AS user_name,
  r.name AS user_role,
  mal.material_id,
  mal.file_path,
  mal.action,
  mal.ip_address,
  mal.user_agent,
  mal.accessed_at
FROM material_access_log mal
LEFT JOIN public.users u ON mal.user_id = u.id
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY mal.accessed_at DESC;

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

-- Test 1: Bucket
SELECT '1. Bucket materials' as test, 
       CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FALTA' END as status
FROM storage.buckets WHERE id = 'materials' AND public = false;

-- Test 2: Políticas
SELECT '2. Políticas RLS' as test,
       CASE WHEN COUNT(*) >= 4 THEN '✅ OK (' || COUNT(*)::text || ')' ELSE '❌ FALTAN' END as status
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%PDF Secure%';

-- Test 3: Tabla audit
SELECT '3. Tabla audit log' as test,
       CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FALTA' END as status
FROM information_schema.tables WHERE table_name = 'material_access_log';

-- Test 4: Función
SELECT '4. Función log_material_access' as test,
       CASE WHEN COUNT(*) > 0 THEN '✅ OK' ELSE '❌ FALTA' END as status
FROM pg_proc WHERE proname = 'log_material_access';

-- =====================================================
-- MENSAJE FINAL
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'El visor PDF seguro está listo.';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos pasos:';
    RAISE NOTICE '1. Subir un PDF de prueba al bucket materials';
    RAISE NOTICE '2. Usar el componente SecurePDFViewer';
    RAISE NOTICE '3. Verificar restricciones (Ctrl+P, Ctrl+S)';
    RAISE NOTICE '';
    RAISE NOTICE 'Documentación:';
    RAISE NOTICE 'AI_CONTEXT/03_GUIAS/GUIA_RAPIDA_VISOR_PDF_SEGURO.md';
    RAISE NOTICE '========================================';
END $$;
