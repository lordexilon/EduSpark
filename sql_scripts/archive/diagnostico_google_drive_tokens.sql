-- Script de diagnóstico para tokens de Google Drive
-- Ejecutar en el SQL Editor de Supabase

-- 1. Ver todos los tokens de un usuario específico
-- Reemplaza 'TU_USER_ID_AQUI' con el ID del usuario
SELECT 
  id,
  user_id,
  service_type,
  expires_at,
  created_at,
  updated_at,
  CASE 
    WHEN expires_at IS NULL THEN 'No expira'
    WHEN expires_at > NOW() THEN 'Válido'
    ELSE 'Expirado'
  END as estado,
  CASE 
    WHEN service_type IN ('drive', 'both') THEN '✅ Tiene acceso a Drive'
    ELSE '❌ No tiene acceso a Drive'
  END as acceso_drive
FROM user_google_tokens
WHERE user_id = 'b72dabe7-9ace-4e50-aa17-f770c5c94c0e'  -- Reemplaza con el ID del usuario
ORDER BY created_at DESC;

-- 2. Ver todos los usuarios que tienen tokens de Drive
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  t.service_type,
  t.expires_at,
  CASE 
    WHEN t.expires_at IS NULL THEN 'No expira'
    WHEN t.expires_at > NOW() THEN 'Válido'
    ELSE 'Expirado'
  END as estado
FROM user_google_tokens t
JOIN users u ON u.id = t.user_id
WHERE t.service_type IN ('drive', 'both')
ORDER BY t.created_at DESC;

-- 3. Ver usuarios que tienen tokens pero NO de Drive
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  t.service_type,
  t.expires_at
FROM user_google_tokens t
JOIN users u ON u.id = t.user_id
WHERE t.service_type NOT IN ('drive', 'both')
ORDER BY t.created_at DESC;

-- 4. Verificar si hay tokens duplicados o conflictos
SELECT 
  user_id,
  service_type,
  COUNT(*) as cantidad,
  MAX(created_at) as ultimo_token
FROM user_google_tokens
GROUP BY user_id, service_type
HAVING COUNT(*) > 1;

-- 5. Verificar estructura de la tabla
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_google_tokens'
ORDER BY ordinal_position;

-- 6. Verificar índices y constraints
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_google_tokens'
  AND schemaname = 'public';

-- 7. Si necesitas actualizar un token existente de 'calendar' a 'both' (SOLO SI ES NECESARIO)
-- ⚠️ CUIDADO: Solo ejecutar si estás seguro de que el token tiene permisos de Drive
-- UPDATE user_google_tokens
-- SET service_type = 'both'
-- WHERE user_id = 'TU_USER_ID_AQUI'
--   AND service_type = 'calendar'
--   AND scope LIKE '%drive%';

