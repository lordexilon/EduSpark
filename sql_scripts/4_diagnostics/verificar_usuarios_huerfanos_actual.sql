-- =====================================================
-- DIAGNÓSTICO ACTUALIZADO: Usuarios Huérfanos
-- Fecha: 2026-01-17
-- Verifica estado actual de usuarios sin auth.users
-- =====================================================

-- =====================================================
-- 1. RESUMEN GENERAL
-- =====================================================
SELECT 
    'RESUMEN GENERAL' as seccion,
    COUNT(*) as total_usuarios_huerfanos
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- =====================================================
-- 2. ESTADO DE LOS 10 USUARIOS ORIGINALES
-- =====================================================
SELECT 
    '2. ESTADO USUARIOS ORIGINALES (Paloma y otros 9)' as seccion,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    pu.created_at,
    CASE 
        WHEN au.id IS NULL THEN '❌ AÚN SIN auth.users'
        ELSE '✅ MIGRADO CORRECTAMENTE'
    END as estado,
    CASE 
        WHEN au.id IS NULL THEN NULL
        ELSE au.created_at
    END as auth_created_at
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.id IN (
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',  -- alecaceres6@outlook.com
    'f709e31e-6d1e-4699-a0c6-4c453d8238bd',  -- katherineaquino2021@gmail.com
    'c53739e3-c227-4427-9801-67896d379972',  -- andreaschuartzman@icloud.com
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',  -- florenciadelgado061@gmail.com
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',  -- eduatobe96@gmail.com
    '9955437d-85e5-4c65-ba46-6752564cdb23',  -- palomaruizdiaz96@gmail.com
    'afdcf53f-9256-44fd-afdd-e942647f20dc',  -- sebastian.riosv00@gmail.com
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',  -- jaraorregojosesebastian@gmail.com
    '85c02afb-0a6b-4a89-9e83-214955806909',  -- otihidalgo9@gmail.com
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191'   -- deisypinhanez97@gmail.com
)
ORDER BY 
    CASE WHEN au.id IS NULL THEN 0 ELSE 1 END,  -- Huérfanos primero
    pu.email;

-- =====================================================
-- 3. NUEVOS USUARIOS HUÉRFANOS (si los hay)
-- =====================================================
SELECT 
    '3. NUEVOS USUARIOS HUÉRFANOS' as seccion,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.created_at,
    EXTRACT(HOUR FROM NOW() - pu.created_at)::INTEGER as horas_desde_creacion,
    pu.identity_document,
    '❌ SIN auth.users' as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL
  AND pu.id NOT IN (
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
ORDER BY pu.created_at DESC;

-- =====================================================
-- 4. TODOS LOS USUARIOS HUÉRFANOS (completo)
-- =====================================================
SELECT 
    '4. LISTADO COMPLETO USUARIOS HUÉRFANOS' as seccion,
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.created_at,
    EXTRACT(DAY FROM NOW() - pu.created_at)::INTEGER as dias_huerfano,
    pu.identity_document,
    CASE 
        WHEN pu.id IN (
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
        ) THEN 'Original (Paloma y otros 9)'
        ELSE 'Nuevo'
    END as tipo
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL
ORDER BY 
    CASE 
        WHEN pu.id IN (
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
        ) THEN 0
        ELSE 1
    END,
    pu.created_at DESC;

-- =====================================================
-- 5. ESTADÍSTICAS POR FECHA DE CREACIÓN
-- =====================================================
SELECT 
    '5. ESTADÍSTICAS POR FECHA' as seccion,
    DATE(pu.created_at) as fecha_creacion,
    COUNT(*) as usuarios_huerfanos,
    array_agg(pu.email ORDER BY pu.email) as emails
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
GROUP BY DATE(pu.created_at)
ORDER BY fecha_creacion DESC;

-- =====================================================
-- 6. RESUMEN EJECUTIVO
-- =====================================================
WITH stats AS (
    SELECT 
        COUNT(*) as total_huerfanos,
        COUNT(*) FILTER (WHERE pu.id IN (
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
        )) as originales_pendientes,
        COUNT(*) FILTER (WHERE pu.id NOT IN (
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
        )) as nuevos_huerfanos
    FROM public.users pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE au.id IS NULL
)
SELECT 
    '6. RESUMEN EJECUTIVO' as seccion,
    '📊 Total de usuarios huérfanos: ' || total_huerfanos as resumen_1,
    '📋 Originales (Paloma y otros 9) pendientes: ' || originales_pendientes as resumen_2,
    '🆕 Nuevos usuarios huérfanos: ' || nuevos_huerfanos as resumen_3,
    CASE 
        WHEN total_huerfanos = 0 THEN '✅ NO HAY USUARIOS HUÉRFANOS'
        WHEN originales_pendientes > 0 THEN '⚠️ AÚN HAY ORIGINALES SIN MIGRAR'
        WHEN nuevos_huerfanos > 0 THEN '⚠️ HAY NUEVOS USUARIOS HUÉRFANOS'
        ELSE '✅ TODOS LOS ORIGINALES MIGRADOS'
    END as estado_general
FROM stats;

-- =====================================================
-- 7. GENERAR JSON PARA MIGRACIÓN (si hay huérfanos)
-- =====================================================
SELECT 
    '7. JSON PARA MIGRACIÓN' as seccion,
    jsonb_build_object(
        'userIds', jsonb_agg(pu.id),
        'useIdentityDocumentAsPassword', true,
        'defaultPassword', 'EduSpark2024!'
    ) as json_para_edge_function
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;
