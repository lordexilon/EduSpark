-- =====================================================
-- Script para crear usuarios en auth.users desde public.users
-- SOLUCIÓN: Usuarios creados por importación masiva sin auth.users
-- =====================================================
--
-- ⚠️ IMPORTANTE: Este script NO crea usuarios directamente en auth.users
-- porque requiere permisos de service_role y usar Supabase Admin API.
--
-- Este script PREPARA los datos y genera un JSON que puedes usar con:
-- 1. Supabase Admin API
-- 2. Edge Function createBulkUsers
-- 3. O manualmente desde Supabase Dashboard
--
-- =====================================================
-- PASO 1: VERIFICAR USUARIOS SIN AUTH.USERS
-- =====================================================

-- Verificar cuántos usuarios necesitan ser creados en auth.users
SELECT 
    COUNT(*) as usuarios_a_crear,
    'Usuarios en public.users sin auth.users' as descripcion
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- =====================================================
-- PASO 2: GENERAR JSON PARA ADMIN API
-- =====================================================

-- Generar JSON con datos de usuarios para crear en auth.users
-- Este JSON puede usarse con Supabase Admin API o Edge Function
SELECT 
    jsonb_agg(
        jsonb_build_object(
            'id', pu.id,
            'email', pu.email,
            'password', NULL,  -- Se generará automáticamente o se debe proporcionar
            'email_confirm', true,
            'user_metadata', jsonb_build_object(
                'first_name', pu.first_name,
                'last_name', pu.last_name,
                'role_id', pu.role_id
            )
        )
    ) as usuarios_json
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- =====================================================
-- PASO 3: GENERAR LISTA DETALLADA PARA REVISIÓN
-- =====================================================

-- Lista detallada de usuarios que necesitan ser creados
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    r.name as role_name,
    pu.identity_document,
    pu.identity_document_type,
    pu.created_at,
    '⚠️ Requiere creación en auth.users' as accion_requerida
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL
ORDER BY pu.created_at DESC;

-- =====================================================
-- PASO 4: GENERAR SCRIPT PARA EDGE FUNCTION
-- =====================================================

-- Generar array JSON para usar con Edge Function createBulkUsers
SELECT 
    jsonb_agg(
        jsonb_build_object(
            'email', pu.email,
            'password', NULL,  -- Se generará automáticamente
            'first_name', pu.first_name,
            'last_name', pu.last_name,
            'role', r.name,
            'institution_id', (
                SELECT ui.institution_id 
                FROM public.user_institutions ui 
                WHERE ui.user_id = pu.id 
                  AND ui.is_primary = true 
                LIMIT 1
            ),
            'identity_document', pu.identity_document,
            'identity_document_type', pu.identity_document_type
        )
    ) as usuarios_para_edge_function
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.id IS NULL;

-- =====================================================
-- PASO 5: VERIFICAR INSTITUCIONES ASIGNADAS
-- =====================================================

-- Verificar que los usuarios sin auth.users tengan institución asignada
SELECT 
    pu.id,
    pu.email,
    pu.first_name,
    pu.last_name,
    i.name as institution_name,
    ui.institution_id,
    CASE 
        WHEN ui.institution_id IS NULL THEN '⚠️ Sin institución asignada'
        ELSE '✅ Con institución'
    END as estado_institucion
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.user_institutions ui ON pu.id = ui.user_id AND ui.is_primary = true
LEFT JOIN public.institutions i ON ui.institution_id = i.id
WHERE au.id IS NULL
ORDER BY pu.created_at DESC;

-- =====================================================
-- OPCIONES PARA CREAR USUARIOS EN AUTH.USERS
-- =====================================================
--
-- OPCIÓN 1: Usar Edge Function createBulkUsers (RECOMENDADO)
-- 
-- 1. Copiar el JSON generado en PASO 4
-- 2. Llamar a la Edge Function createBulkUsers con ese JSON
-- 3. La función creará usuarios en auth.users y actualizará public.users
--
-- OPCIÓN 2: Usar Supabase Admin API
--
-- 1. Usar el JSON generado en PASO 2
-- 2. Llamar a la API de Supabase Admin:
--    POST https://[PROJECT].supabase.co/auth/v1/admin/users
--    Headers: {
--      "Authorization": "Bearer [SERVICE_ROLE_KEY]",
--      "Content-Type": "application/json"
--    }
--    Body: { "email": "...", "password": "...", "email_confirm": true, ... }
--
-- OPCIÓN 3: Eliminar usuarios huérfanos (si no son necesarios)
--
-- Si los usuarios no son necesarios, puedes eliminarlos:
-- DELETE FROM public.users WHERE id IN (
--     SELECT pu.id 
--     FROM public.users pu
--     LEFT JOIN auth.users au ON pu.id = au.id
--     WHERE au.id IS NULL
-- );
--
-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
--
-- 1. Los usuarios sin auth.users NO pueden autenticarse
-- 2. Fueron creados probablemente por importación masiva sin Edge Function
-- 3. Para crear en auth.users, se requiere service_role_key (Admin API)
-- 4. La Edge Function createBulkUsers es la forma más segura
-- 5. Verificar que los usuarios tengan institución asignada antes de crear auth.users
--
-- Ver también:
-- - sql_scripts/4_diagnostics/verify_users_without_auth.sql (diagnóstico)
-- - functions/createBulkUsers/index.ts (Edge Function)
-- - AI_CONTEXT/04_FEATURES/SISTEMA_IMPORTACION_MASIVA_USUARIOS.md

