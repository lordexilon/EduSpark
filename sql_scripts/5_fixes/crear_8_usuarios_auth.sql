-- =====================================================
-- Script para generar JSON y comandos para crear 8 usuarios
-- en auth.users usando Supabase Admin API
-- =====================================================

-- Generar JSON para Supabase Admin API
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
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN public.users pu_email ON pu.email = pu_email.email AND pu.id != pu_email.id
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
AND au.id IS NULL  -- Solo usuarios sin auth.users
AND pu.email IS NOT NULL
AND pu.email != ''
AND pu.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
AND (pu.role_id IS NULL OR r.id IS NOT NULL)
AND pu_email.id IS NULL;

-- =====================================================
-- COMANDOS CURL INDIVIDUALES PARA CADA USUARIO
-- =====================================================
-- Copiar y ejecutar cada comando uno por uno
-- Reemplazar [PROJECT] y [SERVICE_ROLE_KEY] con tus valores

-- Usuario 1: alecaceres6@outlook.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "69c36c20-c0bf-4cc3-ba64-9d5909f6831c",
    "email": "alecaceres6@outlook.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Alejandro",
      "last_name": "Caceres",
      "role_id": 1
    }
  }'
*/

-- Usuario 2: deisypinhanez97@gmail.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ba7bfc03-1bab-47f0-9156-6b22c92b9191",
    "email": "deisypinhanez97@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Deisy",
      "last_name": "Piñanez",
      "role_id": 1
    }
  }'
*/

-- Usuario 3: eduatobe96@gmail.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "3076db90-51e1-4065-bb2d-d321ef6d7a48",
    "email": "eduatobe96@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Eduardo",
      "last_name": "Atobe",
      "role_id": 1
    }
  }'
*/

-- Usuario 4: florenciadelgado061@gmail.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "13d689b8-afa9-4db5-b057-da7bbb5d84fb",
    "email": "florenciadelgado061@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Florencia",
      "last_name": "Delgado",
      "role_id": 1
    }
  }'
*/

-- Usuario 5: jaraorregojosesebastian@gmail.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "a7b71e72-e4c0-4916-9d1a-c175f0fd26e8",
    "email": "jaraorregojosesebastian@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Jose",
      "last_name": "Jara jaraorrego",
      "role_id": 1
    }
  }'
*/

-- Usuario 6: otihidalgo9@gmail.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "85c02afb-0a6b-4a89-9e83-214955806909",
    "email": "otihidalgo9@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "María",
      "last_name": "Hidalgo",
      "role_id": 1
    }
  }'
*/

-- Usuario 7: palomaruizdiaz96@gmail.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "9955437d-85e5-4c65-ba46-6752564cdb23",
    "email": "palomaruizdiaz96@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Paloma",
      "last_name": "Ruiz Díaz",
      "role_id": 1
    }
  }'
*/

-- Usuario 8: sebastian.riosv00@gmail.com
/*
curl -X POST \
  https://[PROJECT].supabase.co/auth/v1/admin/users \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "afdcf53f-9256-44fd-afdd-e942647f20dc",
    "email": "sebastian.riosv00@gmail.com",
    "password": "TempPassword123!",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Sebastian",
      "last_name": "Rios",
      "role_id": 1
    }
  }'
*/

-- =====================================================
-- VERIFICACIÓN POST-CREACIÓN
-- =====================================================
-- Ejecutar después de crear los usuarios para verificar
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    CASE 
        WHEN au.id IS NULL THEN '❌ Aún sin auth.users'
        WHEN au.id != pu.id THEN '⚠️ ID diferente (PROBLEMA)'
        WHEN au.email != pu.email THEN '⚠️ Email diferente (PROBLEMA)'
        ELSE '✅ Creado correctamente en auth.users'
    END as estado,
    au.id as auth_id,
    au.email as auth_email
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id OR au.email = pu.email
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

