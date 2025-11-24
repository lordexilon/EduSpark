-- =====================================================
-- Script para diagnosticar y corregir materiales sin URL
-- =====================================================

-- 1. Ver materiales sin URL
SELECT 
  id,
  title,
  kind,
  course_id,
  unit_id,
  session_id,
  url,
  metadata->>'url' as metadata_url,
  metadata->>'fileUrl' as metadata_fileUrl,
  metadata->>'downloadUrl' as metadata_downloadUrl,
  metadata->>'sourceFileId' as metadata_sourceFileId,
  created_at
FROM public.materials
WHERE url IS NULL OR url = ''
ORDER BY created_at DESC
LIMIT 50;

-- 2. Contar materiales sin URL
SELECT 
  COUNT(*) as total_sin_url,
  COUNT(CASE WHEN metadata->>'url' IS NOT NULL THEN 1 END) as con_url_en_metadata,
  COUNT(CASE WHEN metadata->>'fileUrl' IS NOT NULL THEN 1 END) as con_fileUrl_en_metadata,
  COUNT(CASE WHEN metadata->>'downloadUrl' IS NOT NULL THEN 1 END) as con_downloadUrl_en_metadata
FROM public.materials
WHERE url IS NULL OR url = '';

-- 3. Actualizar materiales que tienen URL en metadata pero no en el campo url
UPDATE public.materials
SET 
  url = COALESCE(
    metadata->>'url',
    metadata->>'fileUrl',
    metadata->>'downloadUrl'
  )
WHERE 
  (url IS NULL OR url = '')
  AND (
    metadata->>'url' IS NOT NULL 
    OR metadata->>'fileUrl' IS NOT NULL 
    OR metadata->>'downloadUrl' IS NOT NULL
  );

-- 4. Verificar resultados
SELECT 
  COUNT(*) as total_actualizados,
  COUNT(CASE WHEN url IS NOT NULL AND url != '' THEN 1 END) as con_url_despues
FROM public.materials
WHERE (url IS NULL OR url = '')
  AND (
    metadata->>'url' IS NOT NULL 
    OR metadata->>'fileUrl' IS NOT NULL 
    OR metadata->>'downloadUrl' IS NOT NULL
  );

-- 5. Generar URLs de Google Drive para materiales que tienen sourceFileId
-- Nota: Estas URLs pueden no funcionar si el archivo no es público o requiere autenticación
UPDATE public.materials
SET 
  url = CASE 
    WHEN metadata->>'sourceFileId' IS NOT NULL THEN
      'https://drive.google.com/file/d/' || (metadata->>'sourceFileId') || '/view'
    ELSE NULL
  END
WHERE 
  (url IS NULL OR url = '')
  AND metadata->>'sourceFileId' IS NOT NULL
  AND (
    metadata->>'url' IS NULL 
    AND metadata->>'fileUrl' IS NULL 
    AND metadata->>'downloadUrl' IS NULL
  );

-- 6. Mostrar materiales que aún no tienen URL (necesitan ser corregidos manualmente o tienen problemas)
SELECT 
  id,
  title,
  kind,
  course_id,
  metadata->>'sourceFileId' as source_file_id,
  CASE 
    WHEN metadata->>'sourceFileId' IS NOT NULL THEN
      'https://drive.google.com/file/d/' || (metadata->>'sourceFileId') || '/view'
    ELSE NULL
  END as url_generada_google_drive,
  created_at
FROM public.materials
WHERE (url IS NULL OR url = '')
  AND (
    metadata->>'url' IS NULL 
    AND metadata->>'fileUrl' IS NULL 
    AND metadata->>'downloadUrl' IS NULL
  )
ORDER BY created_at DESC;

