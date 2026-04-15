-- =====================================================
-- Script para crear usuarios en auth.users
-- 10 usuarios recientes sin auth.users
-- Fecha: 2026-01-07
-- =====================================================

-- IDs de los usuarios a crear en auth.users
-- Lista de IDs para referencia:
-- '69c36c20-c0bf-4cc3-ba64-9d5909f6831c'  -- alecaceres6@outlook.com
-- 'f709e31e-6d1e-4699-a0c6-4c453d8238bd'  -- katherineaquino2021@gmail.com
-- 'c53739e3-c227-4427-9801-67896d379972'  -- andreaschuartzman@icloud.com
-- '13d689b8-afa9-4db5-b057-da7bbb5d84fb'  -- florenciadelgado061@gmail.com
-- '3076db90-51e1-4065-bb2d-d321ef6d7a48'  -- eduatobe96@gmail.com
-- '9955437d-85e5-4c65-ba46-6752564cdb23'  -- palomaruizdiaz96@gmail.com
-- 'afdcf53f-9256-44fd-afdd-e942647f20dc'  -- sebastian.riosv00@gmail.com
-- 'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8'  -- jaraorregojosesebastian@gmail.com
-- '85c02afb-0a6b-4a89-9e83-214955806909'  -- otihidalgo9@gmail.com
-- 'ba7bfc03-1bab-47f0-9156-6b22c92b9191'   -- deisypinhanez97@gmail.com

-- =====================================================
-- PASO 1: VERIFICAR USUARIOS Y SUS DATOS
-- =====================================================
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.role_id,
    ui.institution_id,
    i.name as institution_name,
    pu.identity_document,
    pu.identity_document_type,
    CASE 
        WHEN au.id IS NULL THEN '❌ Sin auth.users'
        ELSE '✅ Ya existe en auth.users'
    END as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN public.user_institutions ui ON pu.id = ui.user_id AND ui.is_primary = true
LEFT JOIN public.institutions i ON ui.institution_id = i.id
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'f709e31e-6d1e-4699-a0c6-4c453d8238bd',
    'c53739e3-c227-4427-9801-67896d379972',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191'
)
ORDER BY pu.email;

-- =====================================================
-- PASO 2: GENERAR JSON PARA EDGE FUNCTION createBulkUsers
-- =====================================================
-- Este JSON se puede usar directamente con la Edge Function
SELECT 
    jsonb_agg(
        jsonb_build_object(
            'email', pu.email,
            'password', NULL,  -- Se generará automáticamente
            'first_name', pu.first_name,
            'last_name', pu.last_name,
            'role', r.name,
            'institution_id', ui.institution_id,
            'identity_document', pu.identity_document,
            'identity_document_type', pu.identity_document_type
        )
    ) as usuarios_json_para_edge_function
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN public.user_institutions ui ON pu.id = ui.user_id AND ui.is_primary = true
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'f709e31e-6d1e-4699-a0c6-4c453d8238bd',
    'c53739e3-c227-4427-9801-67896d379972',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191'
)
AND au.id IS NULL;  -- Solo usuarios sin auth.users

-- =====================================================
-- PASO 3: GENERAR JSON PARA SUPABASE ADMIN API
-- =====================================================
-- Este JSON se puede usar con Supabase Admin API
SELECT 
    jsonb_agg(
        jsonb_build_object(
            'id', pu.id,
            'email', pu.email,
            'password', NULL,  -- Se debe generar o proporcionar
            'email_confirm', true,
            'user_metadata', jsonb_build_object(
                'first_name', pu.first_name,
                'last_name', pu.last_name,
                'role_id', pu.role_id
            )
        )
    ) as usuarios_json_para_admin_api
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'f709e31e-6d1e-4699-a0c6-4c453d8238bd',
    'c53739e3-c227-4427-9801-67896d379972',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191'
)
AND au.id IS NULL;  -- Solo usuarios sin auth.users

-- =====================================================
-- PASO 4: VERIFICAR INSTITUCIONES ASIGNADAS
-- =====================================================
-- Verificar que todos los usuarios tengan institución
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    ui.institution_id,
    i.name as institution_name,
    CASE 
        WHEN ui.institution_id IS NULL THEN '⚠️ Sin institución asignada'
        ELSE '✅ Con institución'
    END as estado_institucion
FROM public.users pu
LEFT JOIN public.user_institutions ui ON pu.id = ui.user_id AND ui.is_primary = true
LEFT JOIN public.institutions i ON ui.institution_id = i.id
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    'f709e31e-6d1e-4699-a0c6-4c453d8238bd',
    'c53739e3-c227-4427-9801-67896d379972',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '9955437d-85e5-4c65-ba46-6752564cdb23',
    'afdcf53f-9256-44fd-afdd-e942647f20dc',
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191'
)
ORDER BY pu.email;

-- =====================================================
-- INSTRUCCIONES PARA CREAR USUARIOS
-- =====================================================
--
-- OPCIÓN 1: Usar Edge Function createBulkUsers (RECOMENDADO)
--
-- 1. Copiar el JSON generado en PASO 2
-- 2. Llamar a la Edge Function desde el frontend o con curl:
--
--    curl -X POST \
--      https://[PROJECT].supabase.co/functions/v1/createBulkUsers \
--      -H "Authorization: Bearer [SESSION_TOKEN]" \
--      -H "Content-Type: application/json" \
--      -d '{"users": [PASTE_JSON_HERE]}'
--
-- 3. La función creará usuarios en auth.users y actualizará public.users
--
-- OPCIÓN 2: Usar Supabase Admin API
--
-- 1. Copiar el JSON generado en PASO 3
-- 2. Para cada usuario, hacer una llamada:
--
--    curl -X POST \
--      https://[PROJECT].supabase.co/auth/v1/admin/users \
--      -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
--      -H "Content-Type: application/json" \
--      -d '{
--        "email": "usuario@ejemplo.com",
--        "password": "Password123!",
--        "email_confirm": true,
--        "user_metadata": {
--          "first_name": "Nombre",
--          "last_name": "Apellido"
--        }
--      }'
--
-- OPCIÓN 3: Usar Supabase Dashboard
--
-- 1. Ir a Authentication > Users
-- 2. Clic en "Add User"
-- 3. Ingresar email y contraseña
-- 4. Marcar "Auto Confirm User"
-- 5. Repetir para cada usuario
--
-- =====================================================
-- VERIFICACIÓN POST-CREACIÓN
-- =====================================================
-- Después de crear usuarios, ejecutar esto para verificar:
    SELECT 
        pu.id,
        pu.email,
        pu.first_name,
        pu.last_name,
        CASE 
            WHEN au.id IS NULL THEN '❌ Aún sin auth.users'
            ELSE '✅ Creado en auth.users'
        END as estado
    FROM public.users pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE pu.id IN (
        '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
        'f709e31e-6d1e-4699-a0c6-4c453d8238bd',
        'c53739e3-c227-4427-9801-67896d379972',
        '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
        '3076db90-51e1-4065-bb2d-d321ef6d7a48',
        '9955437d-85e5-4c65-ba46-6752564cdb23',
        'afdcf53f-9256-44fd-afdd-e942647f20dc',
        'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
        '85c02afb-0a6b-4a89-9e83-214955806909',
        'ba7bfc03-1bab-47f0-9156-6b22c92b9191'
    )
    ORDER BY pu.email;

