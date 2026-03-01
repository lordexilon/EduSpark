-- =====================================================
-- DIAGNÓSTICO DE PROBLEMAS AL IMPORTAR USUARIOS
-- Identifica problemas comunes antes de importar
-- =====================================================

-- =====================================================
-- PROBLEMA 1: Usuarios en public.users sin auth.users
-- =====================================================
-- Estos usuarios existen en public.users pero NO en auth.users
-- Al intentar crear en auth.users, pueden generar IDs diferentes
SELECT 
    'PROBLEMA 1: Usuarios sin auth.users' as problema,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    pu.role_id,
    r.name as role_name,
    pu.created_at,
    '❌ Existe en public.users pero NO en auth.users' as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL
ORDER BY pu.created_at DESC;

-- =====================================================
-- PROBLEMA 2: Emails duplicados con IDs diferentes
-- =====================================================
-- Un email existe en auth.users con un ID diferente al de public.users
-- Esto causa conflictos al intentar sincronizar
SELECT 
    'PROBLEMA 2: Email duplicado con IDs diferentes' as problema,
    au.id as auth_id,
    pu.id as public_id,
    au.email,
    au.created_at as auth_created_at,
    pu.created_at as public_created_at,
    '⚠️ Email existe en ambos pero con IDs diferentes' as estado
FROM auth.users au
INNER JOIN public.users pu ON au.email = pu.email
WHERE au.id != pu.id
  AND au.deleted_at IS NULL
ORDER BY au.email;

-- =====================================================
-- PROBLEMA 3: Usuarios en auth.users sin public.users
-- =====================================================
-- Estos usuarios existen en auth.users pero NO en public.users
-- Pueden causar errores de "Usuario autenticado pero no encontrado"
SELECT 
    'PROBLEMA 3: Usuarios sin public.users' as problema,
    au.id,
    au.email,
    au.raw_user_meta_data->>'first_name' as first_name,
    au.raw_user_meta_data->>'last_name' as last_name,
    au.created_at,
    '❌ Existe en auth.users pero NO en public.users' as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.deleted_at IS NULL
ORDER BY au.created_at DESC;

-- =====================================================
-- PROBLEMA 4: IDs duplicados pero emails diferentes
-- =====================================================
-- Mismo ID pero emails diferentes (caso muy raro pero posible)
SELECT 
    'PROBLEMA 4: Mismo ID con emails diferentes' as problema,
    au.id,
    au.email as auth_email,
    pu.email as public_email,
    au.created_at as auth_created_at,
    pu.created_at as public_created_at,
    '⚠️ Mismo ID pero emails diferentes' as estado
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.id
WHERE au.email != pu.email
  AND au.deleted_at IS NULL
ORDER BY au.id;

-- =====================================================
-- PROBLEMA 5: Usuarios con emails NULL o vacíos
-- =====================================================
-- Usuarios sin email válido (no se pueden crear en auth.users)
SELECT 
    'PROBLEMA 5: Usuarios sin email válido' as problema,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    CASE 
        WHEN pu.email IS NULL THEN '❌ Email es NULL'
        WHEN pu.email = '' THEN '❌ Email está vacío'
        WHEN pu.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN '❌ Email inválido'
        ELSE '✅ Email válido'
    END as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL  -- Solo usuarios sin auth.users
  AND (
    pu.email IS NULL 
    OR pu.email = '' 
    OR pu.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  )
ORDER BY pu.email;

-- =====================================================
-- PROBLEMA 6: Usuarios con role_id inválido
-- =====================================================
-- Usuarios con role_id que no existe en la tabla roles
SELECT 
    'PROBLEMA 6: Usuarios con role_id inválido' as problema,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    pu.role_id,
    '❌ role_id no existe en tabla roles' as estado
FROM public.users pu
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL  -- Solo usuarios sin auth.users
  AND pu.role_id IS NOT NULL
  AND r.id IS NULL
ORDER BY pu.email;

-- =====================================================
-- RESUMEN DE PROBLEMAS
-- =====================================================
SELECT 
    'RESUMEN' as tipo,
    COUNT(*) as cantidad,
    'Usuarios en public.users sin auth.users' as descripcion
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL

UNION ALL

SELECT 
    'RESUMEN' as tipo,
    COUNT(*) as cantidad,
    'Emails duplicados con IDs diferentes' as descripcion
FROM auth.users au
INNER JOIN public.users pu ON au.email = pu.email
WHERE au.id != pu.id
  AND au.deleted_at IS NULL

UNION ALL

SELECT 
    'RESUMEN' as tipo,
    COUNT(*) as cantidad,
    'Usuarios en auth.users sin public.users' as descripcion
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.deleted_at IS NULL

UNION ALL

SELECT 
    'RESUMEN' as tipo,
    COUNT(*) as cantidad,
    'Mismo ID con emails diferentes' as descripcion
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.id
WHERE au.email != pu.email
  AND au.deleted_at IS NULL

UNION ALL

SELECT 
    'RESUMEN' as tipo,
    COUNT(*) as cantidad,
    'Usuarios sin email válido' as descripcion
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
  AND (
    pu.email IS NULL 
    OR pu.email = '' 
    OR pu.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  )

UNION ALL

SELECT 
    'RESUMEN' as tipo,
    COUNT(*) as cantidad,
    'Usuarios con role_id inválido' as descripcion
FROM public.users pu
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
  AND pu.role_id IS NOT NULL
  AND r.id IS NULL;

-- =====================================================
-- USUARIOS LISTOS PARA IMPORTAR (sin problemas)
-- =====================================================
-- Estos usuarios pueden importarse sin problemas
SELECT 
    'USUARIOS LISTOS PARA IMPORTAR' as tipo,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.role_id,
    pu.created_at,
    '✅ Listo para importar' as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN public.users pu_email ON pu.email = pu_email.email AND pu.id != pu_email.id
WHERE au.id IS NULL  -- No existe en auth.users
  AND pu.email IS NOT NULL  -- Tiene email
  AND pu.email != ''  -- Email no está vacío
  AND pu.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'  -- Email válido
  AND (pu.role_id IS NULL OR r.id IS NOT NULL)  -- role_id válido o NULL
  AND pu_email.id IS NULL  -- No hay otro usuario con el mismo email
ORDER BY pu.email;

