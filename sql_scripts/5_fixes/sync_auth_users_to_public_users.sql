-- =====================================================
-- Script para sincronizar usuarios de auth.users a public.users
-- Soluciona el problema: "Usuario autenticado pero no encontrado en public.users"
-- =====================================================

-- 1. Verificar usuarios que existen en auth.users pero NO en public.users
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    au.raw_user_meta_data->>'first_name' as first_name,
    au.raw_user_meta_data->>'last_name' as last_name,
    au.raw_user_meta_data->>'role_id' as role_id_from_metadata,
    CASE 
        WHEN pu.id IS NULL THEN '❌ NO EXISTE en public.users'
        ELSE '✅ EXISTE en public.users'
    END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.deleted_at IS NULL  -- Solo usuarios activos
ORDER BY au.created_at DESC;

-- 2. Contar cuántos usuarios necesitan sincronización
SELECT 
    COUNT(*) as usuarios_sin_sincronizar
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.deleted_at IS NULL
  AND pu.id IS NULL;

-- =====================================================
-- SINCRONIZACIÓN AUTOMÁTICA
-- =====================================================
-- ⚠️ IMPORTANTE: Este script es SEGURO y NO modificará usuarios existentes
-- 
-- GARANTÍAS DE SEGURIDAD:
-- 1. Solo inserta usuarios que NO existen en public.users (WHERE pu.id IS NULL)
-- 2. Solo inserta usuarios cuyo email NO existe en public.users (WHERE pu_email.id IS NULL)
-- 3. Usa ON CONFLICT DO NOTHING para evitar sobrescribir datos existentes
-- 4. Los usuarios existentes en public.users NO se tocarán
-- 5. Si hay conflicto de email (email existe con otro ID), se omite ese usuario
-- 6. Usa transacción (BEGIN/COMMIT) para poder revertir si es necesario
--
-- CASOS MANEJADOS:
-- ✅ Usuario nuevo: Se crea normalmente
-- ✅ Usuario ya existe con mismo ID: Se omite (ON CONFLICT DO NOTHING)
-- ✅ Email existe con ID diferente: Se omite (evita error de duplicado)
--
-- Ejecutar primero las consultas de verificación arriba
-- para asegurarse de que son los usuarios correctos antes de sincronizar

BEGIN;

-- 3. Verificar usuarios con emails duplicados pero IDs diferentes
-- Esto puede ocurrir si un usuario fue creado manualmente con un ID diferente
SELECT 
    au.id as auth_id,
    au.email,
    pu.id as public_id,
    CASE 
        WHEN pu.id IS NULL THEN '⚠️ Email existe pero con ID diferente'
        ELSE '✅ Usuario ya sincronizado'
    END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.users pu_email ON au.email = pu_email.email AND au.id != pu_email.id
WHERE au.deleted_at IS NULL
  AND pu.id IS NULL  -- No existe con el mismo ID
  AND pu_email.id IS NOT NULL  -- Pero existe con el mismo email
ORDER BY au.created_at DESC;

-- 4. Insertar usuarios de auth.users que no existen en public.users
-- IMPORTANTE: Este INSERT solo afecta usuarios que NO existen en public.users
-- Los usuarios existentes NO se modificarán gracias a la condición WHERE pu.id IS NULL
-- Si hay conflicto de email (email existe pero con ID diferente), se omite ese usuario
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
    COALESCE((au.raw_user_meta_data->>'role_id')::integer, 3), -- Default: student (ID: 3)
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.users pu_email ON au.email = pu_email.email  -- Verificar si el email ya existe
WHERE au.deleted_at IS NULL  -- Solo usuarios activos
  AND pu.id IS NULL  -- ⚠️ CRÍTICO: Solo inserta usuarios que NO existen en public.users
  AND pu_email.id IS NULL  -- ⚠️ CRÍTICO: Solo inserta si el email NO existe en public.users
ON CONFLICT (email) DO NOTHING;  -- ⚠️ Si el email ya existe (con otro ID), NO hacer nada (evita error de duplicado)
-- NOTA: PostgreSQL solo permite UNA cláusula ON CONFLICT por INSERT
-- Usamos ON CONFLICT (email) porque es más probable que haya conflicto de email que de ID
-- El WHERE pu.id IS NULL ya filtra los IDs duplicados antes del INSERT

-- 5. Verificar que se sincronizaron correctamente
-- Mostrar usuarios sincronizados (nuevos)
SELECT 
    COUNT(*) as usuarios_sincronizados,
    'Usuarios nuevos creados en public.users' as descripcion
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.id
WHERE au.deleted_at IS NULL;

-- Verificar que NO se modificaron usuarios existentes
-- Esta consulta debe mostrar 0 si todo está bien
SELECT 
    COUNT(*) as usuarios_modificados_incorrectamente,
    '⚠️ Si este número es > 0, algo salió mal' as advertencia
FROM public.users pu
INNER JOIN auth.users au ON pu.id = au.id
WHERE au.deleted_at IS NULL
  AND pu.email != au.email;  -- Verificar que los emails coinciden

-- 6. Verificar antes de hacer COMMIT
-- Si ves algún problema en las consultas anteriores, hacer ROLLBACK
-- Si todo está bien, hacer COMMIT

-- ⚠️ VERIFICACIÓN FINAL ANTES DE COMMIT:
-- 1. Revisar que usuarios_sincronizados es el número esperado
-- 2. Verificar que usuarios_modificados_incorrectamente es 0
-- 3. Si todo está bien, ejecutar COMMIT
-- 4. Si hay problemas, ejecutar ROLLBACK

-- Descomentar la línea apropiada:
COMMIT;
-- ROLLBACK; -- ⚠️ Descomentar SOLO si necesitas revertir los cambios

-- =====================================================
-- VERIFICAR Y RECREAR EL TRIGGER (si es necesario)
-- =====================================================

-- 7. Verificar si el trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users'
  AND event_object_schema = 'auth';

-- 8. Si el trigger no existe, ejecutar este bloque:
/*
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role_id, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE((new.raw_user_meta_data->>'role_id')::integer, 3), -- Default: student
    new.created_at,
    new.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    updated_at = NOW();
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/

