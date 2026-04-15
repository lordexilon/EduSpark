-- 51_sync_all_missing_users.sql
-- Sincroniza TODOS los usuarios de auth.users que no están en public.users
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: VERIFICAR CUÁNTOS USUARIOS FALTAN
-- =====================================================

SELECT 
  'Usuarios faltantes' as verificacion,
  COUNT(*) as usuarios_en_auth,
  (SELECT COUNT(*) FROM public.users) as usuarios_en_public,
  COUNT(*) - (SELECT COUNT(*) FROM public.users) as usuarios_faltantes
FROM auth.users
WHERE deleted_at IS NULL;

-- =====================================================
-- PASO 2: LISTAR USUARIOS QUE FALTAN
-- =====================================================

SELECT 
  'Usuarios que faltan en public.users' as listado,
  au.id,
  au.email,
  au.raw_user_meta_data->>'first_name' as first_name,
  au.raw_user_meta_data->>'last_name' as last_name,
  (au.raw_user_meta_data->>'role_id')::integer as role_id,
  au.created_at,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN '⏳ No confirmado'
    ELSE '✅ Confirmado'
  END as estado_email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.deleted_at IS NULL
ORDER BY au.created_at DESC;

-- =====================================================
-- PASO 3: INSERTAR TODOS LOS USUARIOS FALTANTES
-- =====================================================

INSERT INTO public.users (id, email, first_name, last_name, role_id)
SELECT 
  au.id,
  COALESCE(au.email, ''),
  COALESCE(au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  1 -- Siempre estudiante (ID: 1) - Mapeo: 1=student, 2=teacher, 3=admin, 4=coordinator
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.deleted_at IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
  last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
  role_id = COALESCE(EXCLUDED.role_id, public.users.role_id),
  updated_at = NOW();

-- =====================================================
-- PASO 4: VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  'Verificación final' as verificacion,
  COUNT(DISTINCT au.id) as usuarios_en_auth,
  COUNT(DISTINCT pu.id) as usuarios_en_public,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT pu.id) as usuarios_sin_sincronizar
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.deleted_at IS NULL;

-- =====================================================
-- PASO 5: LISTAR TODOS LOS USUARIOS SINCRONIZADOS
-- =====================================================

SELECT 
  'Usuarios sincronizados' as resumen,
  pu.id,
  pu.email,
  pu.first_name,
  pu.last_name,
  r.name as role_name,
  au.email_confirmed_at IS NOT NULL as email_confirmado,
  pu.created_at
FROM public.users pu
INNER JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.deleted_at IS NULL
ORDER BY pu.created_at DESC;

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
DECLARE
  auth_count INTEGER;
  public_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_count
  FROM auth.users
  WHERE deleted_at IS NULL;
  
  SELECT COUNT(*) INTO public_count
  FROM public.users;
  
  missing_count := auth_count - public_count;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESULTADO DE LA SINCRONIZACIÓN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuarios en auth.users: %', auth_count;
  RAISE NOTICE 'Usuarios en public.users: %', public_count;
  RAISE NOTICE 'Usuarios faltantes: %', missing_count;
  RAISE NOTICE '';
  IF missing_count = 0 THEN
    RAISE NOTICE '✅ Todos los usuarios están sincronizados correctamente.';
  ELSIF missing_count > 0 THEN
    RAISE NOTICE '⚠️ Aún hay % usuario(s) faltante(s). Revisa los resultados arriba.', missing_count;
    RAISE NOTICE '   Puede ser que esos usuarios tengan problemas de datos.';
  ELSE
    RAISE NOTICE '⚠️ Hay más usuarios en public.users que en auth.users.';
    RAISE NOTICE '   Esto puede indicar un problema de integridad de datos.';
  END IF;
  RAISE NOTICE '';
END $$;

