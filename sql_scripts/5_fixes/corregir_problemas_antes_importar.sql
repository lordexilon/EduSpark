-- =====================================================
-- CORRECCIÓN DE PROBLEMAS ANTES DE IMPORTAR USUARIOS
-- Ejecutar DESPUÉS de diagnosticar_problemas_importacion_usuarios.sql
-- =====================================================

-- ⚠️ IMPORTANTE: Ejecutar primero diagnostico_problemas_importacion_usuarios.sql
-- para identificar qué problemas existen antes de corregirlos

BEGIN;

-- =====================================================
-- CORRECCIÓN 1: Eliminar usuarios duplicados por email
-- =====================================================
-- Si un email existe en auth.users con un ID diferente al de public.users,
-- eliminamos el de auth.users (mantenemos el de public.users)
-- ⚠️ SOLO si el usuario de auth.users NO tiene datos importantes

-- Verificar primero cuáles se eliminarán
SELECT 
    'CORRECCIÓN 1: Usuarios a eliminar de auth.users (email duplicado)' as accion,
    au.id as auth_id,
    pu.id as public_id,
    au.email,
    au.created_at as auth_created_at,
    pu.created_at as public_created_at,
    '⚠️ Se eliminará de auth.users (mantener public.users)' as accion_a_realizar
FROM auth.users au
INNER JOIN public.users pu ON au.email = pu.email
WHERE au.id != pu.id
  AND au.deleted_at IS NULL
ORDER BY au.email;

-- Eliminar usuarios de auth.users con email duplicado
-- (mantener el de public.users)
DELETE FROM auth.users
WHERE id IN (
    SELECT au.id
    FROM auth.users au
    INNER JOIN public.users pu ON au.email = pu.email
    WHERE au.id != pu.id
      AND au.deleted_at IS NULL
);

-- =====================================================
-- CORRECCIÓN 2: Sincronizar usuarios de auth.users a public.users
-- =====================================================
-- Crear usuarios en public.users si existen en auth.users pero no en public.users
-- (Esto es seguro, solo crea usuarios nuevos)

INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role_id,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE((au.raw_user_meta_data->>'role_id')::integer, 3), -- Default: student
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.users pu_email ON au.email = pu_email.email
WHERE au.deleted_at IS NULL
  AND pu.id IS NULL  -- No existe en public.users
  AND pu_email.id IS NULL  -- El email no existe en public.users
ON CONFLICT (id) DO NOTHING
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- CORRECCIÓN 3: Corregir emails inválidos o NULL
-- =====================================================
-- Marcar usuarios con emails inválidos (no se pueden importar)
-- Opción: Asignar un email temporal o eliminar

-- Verificar usuarios con emails inválidos
SELECT 
    'CORRECCIÓN 3: Usuarios con emails inválidos' as accion,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    CASE 
        WHEN pu.email IS NULL THEN '❌ Email es NULL - NO se puede importar'
        WHEN pu.email = '' THEN '❌ Email está vacío - NO se puede importar'
        WHEN pu.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN '❌ Email inválido - NO se puede importar'
        ELSE '✅ Email válido'
    END as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
  AND (
    pu.email IS NULL 
    OR pu.email = '' 
    OR pu.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  )
ORDER BY pu.email;

-- ⚠️ OPCIÓN: Eliminar usuarios con emails inválidos (descomentar si es necesario)
-- DELETE FROM public.users
-- WHERE id IN (
--     SELECT pu.id
--     FROM public.users pu
--     LEFT JOIN auth.users au ON pu.id = au.id
--     WHERE au.id IS NULL
--       AND (
--         pu.email IS NULL 
--         OR pu.email = '' 
--         OR pu.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
--       )
-- );

-- =====================================================
-- CORRECCIÓN 4: Corregir role_id inválidos
-- =====================================================
-- Asignar role_id por defecto (student = 3) si el role_id es inválido

-- Verificar usuarios con role_id inválido
SELECT 
    'CORRECCIÓN 4: Usuarios con role_id inválido' as accion,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    pu.role_id,
    '⚠️ Se asignará role_id = 3 (student) por defecto' as accion_a_realizar
FROM public.users pu
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
  AND pu.role_id IS NOT NULL
  AND r.id IS NULL;

-- Corregir role_id inválidos (asignar student = 3 por defecto)
UPDATE public.users
SET role_id = 3  -- student
WHERE id IN (
    SELECT pu.id
    FROM public.users pu
    LEFT JOIN public.roles r ON pu.role_id = r.id
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE au.id IS NULL
      AND pu.role_id IS NOT NULL
      AND r.id IS NULL
);

-- =====================================================
-- CORRECCIÓN 5: Sincronizar emails entre auth.users y public.users
-- =====================================================
-- Si el ID coincide pero el email es diferente, actualizar public.users con el email de auth.users

-- Verificar usuarios con emails diferentes
SELECT 
    'CORRECCIÓN 5: Usuarios con emails diferentes' as accion,
    au.id,
    au.email as auth_email,
    pu.email as public_email,
    '⚠️ Se actualizará public.users con el email de auth.users' as accion_a_realizar
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.id
WHERE au.email != pu.email
  AND au.deleted_at IS NULL;

-- Actualizar emails en public.users con el email de auth.users
UPDATE public.users pu
SET email = au.email,
    updated_at = NOW()
FROM auth.users au
WHERE pu.id = au.id
  AND au.email != pu.email
  AND au.deleted_at IS NULL;

-- =====================================================
-- VERIFICACIÓN POST-CORRECCIÓN
-- =====================================================
-- Verificar que los problemas se corrigieron

SELECT 
    'VERIFICACIÓN POST-CORRECCIÓN' as tipo,
    COUNT(*) as cantidad,
    'Usuarios en public.users sin auth.users (listos para importar)' as descripcion
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
  AND pu.email IS NOT NULL
  AND pu.email != ''
  AND pu.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  AND (pu.role_id IS NULL OR EXISTS (SELECT 1 FROM public.roles r WHERE r.id = pu.role_id))
  AND NOT EXISTS (
    SELECT 1 
    FROM public.users pu_email 
    WHERE pu_email.email = pu.email 
      AND pu_email.id != pu.id
  );

-- Si todo está correcto, hacer COMMIT
-- Si hay algún problema, hacer ROLLBACK
COMMIT;
-- ROLLBACK; -- ⚠️ Descomentar si necesitas revertir los cambios

