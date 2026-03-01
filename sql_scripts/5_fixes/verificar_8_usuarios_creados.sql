-- =====================================================
-- VERIFICACIÓN DE LOS 8 USUARIOS CREADOS EN auth.users
-- Ejecutar después de crear los usuarios
-- =====================================================

-- Verificar que los 8 usuarios fueron creados correctamente
SELECT 
    pu.id as public_id,
    au.id as auth_id,
    pu.email as public_email,
    au.email as auth_email,
    pu.first_name,
    pu.last_name,
    pu.role_id,
    r.name as role_name,
    CASE 
        WHEN au.id IS NULL THEN '❌ NO existe en auth.users'
        WHEN au.id != pu.id THEN '⚠️ ID diferente (PROBLEMA)'
        WHEN au.email != pu.email THEN '⚠️ Email diferente (PROBLEMA)'
        WHEN au.deleted_at IS NOT NULL THEN '⚠️ Usuario eliminado'
        ELSE '✅ Creado correctamente'
    END as estado,
    au.created_at as auth_created_at,
    pu.created_at as public_created_at
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc'
)
ORDER BY pu.email;

-- =====================================================
-- RESUMEN DE VERIFICACIÓN
-- =====================================================
SELECT 
    COUNT(*) FILTER (WHERE au.id IS NOT NULL AND au.id = pu.id AND au.email = pu.email) as usuarios_correctos,
    COUNT(*) FILTER (WHERE au.id IS NULL) as usuarios_sin_auth,
    COUNT(*) FILTER (WHERE au.id != pu.id) as usuarios_id_diferente,
    COUNT(*) FILTER (WHERE au.email != pu.email) as usuarios_email_diferente,
    COUNT(*) as total_usuarios
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc'
);

-- =====================================================
-- VERIFICAR METADATOS
-- =====================================================
-- Verificar que los user_metadata se guardaron correctamente
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'first_name' as metadata_first_name,
    au.raw_user_meta_data->>'last_name' as metadata_last_name,
    au.raw_user_meta_data->>'role_id' as metadata_role_id,
    pu.first_name as public_first_name,
    pu.last_name as public_last_name,
    pu.role_id as public_role_id,
    CASE 
        WHEN au.raw_user_meta_data->>'first_name' = pu.first_name 
         AND au.raw_user_meta_data->>'last_name' = pu.last_name 
         AND au.raw_user_meta_data->>'role_id' = pu.role_id::text
        THEN '✅ Metadatos coinciden'
        ELSE '⚠️ Metadatos diferentes'
    END as estado_metadatos
FROM auth.users au
INNER JOIN public.users pu ON au.id = pu.id
WHERE au.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc'
)
ORDER BY au.email;

-- =====================================================
-- VERIFICAR ESTADO DE CONFIRMACIÓN DE EMAIL
-- =====================================================
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    au.confirmed_at,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
        WHEN au.confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '⚠️ Email no confirmado'
    END as estado_confirmacion
FROM auth.users au
WHERE au.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc'
)
ORDER BY au.email;

