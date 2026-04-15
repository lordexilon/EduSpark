-- =====================================================
-- Script para generar JSON listo para usar
-- 10 usuarios sin auth.users
-- =====================================================
-- 
-- Este script genera el JSON exacto que necesitas copiar y pegar
-- para crear estos usuarios en auth.users usando la Edge Function
--

-- =====================================================
-- JSON PARA EDGE FUNCTION createBulkUsers
-- =====================================================
-- Copia este resultado y úsalo con la Edge Function
SELECT 
    jsonb_pretty(
        jsonb_build_object(
            'users',
            jsonb_agg(
                jsonb_build_object(
                    'email', pu.email,
                    'password', NULL,
                    'first_name', pu.first_name,
                    'last_name', pu.last_name,
                    'role', COALESCE(r.name, 'student'),
                    'institution_id', ui.institution_id,
                    'identity_document', pu.identity_document,
                    'identity_document_type', pu.identity_document_type
                ) ORDER BY pu.email
            )
        )
    ) as json_completo_para_edge_function
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
AND au.id IS NULL;

-- =====================================================
-- JSON SOLO CON EL ARRAY DE USUARIOS (sin wrapper)
-- =====================================================
-- Si necesitas solo el array de usuarios
SELECT 
    jsonb_pretty(
        jsonb_agg(
            jsonb_build_object(
                'email', pu.email,
                'password', NULL,
                'first_name', pu.first_name,
                'last_name', pu.last_name,
                'role', COALESCE(r.name, 'student'),
                'institution_id', ui.institution_id,
                'identity_document', pu.identity_document,
                'identity_document_type', pu.identity_document_type
            ) ORDER BY pu.email
        )
    ) as array_usuarios
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
AND au.id IS NULL;

-- =====================================================
-- VERIFICAR DATOS ANTES DE GENERAR JSON
-- =====================================================
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    COALESCE(r.name, 'student') as role_name,
    ui.institution_id,
    i.name as institution_name,
    pu.identity_document,
    pu.identity_document_type,
    CASE 
        WHEN ui.institution_id IS NULL THEN '⚠️ Sin institución'
        ELSE '✅ Con institución'
    END as estado_institucion
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
AND au.id IS NULL
ORDER BY pu.email;

