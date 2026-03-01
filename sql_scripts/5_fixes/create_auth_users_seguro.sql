-- =====================================================
-- Script SEGURO para crear usuarios en auth.users
-- Incluye validaciones y usa IDs específicos
-- =====================================================

-- ⚠️ IMPORTANTE: Ejecutar PRIMERO:
-- 1. diagnostico_problemas_importacion_usuarios.sql
-- 2. corregir_problemas_antes_importar.sql
-- 3. Este script (create_auth_users_seguro.sql)

-- =====================================================
-- PASO 1: VERIFICAR USUARIOS LISTOS PARA IMPORTAR
-- =====================================================
-- Solo usuarios que NO tienen problemas y pueden importarse
SELECT 
    'USUARIOS LISTOS PARA IMPORTAR' as tipo,
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
    pu.created_at,
    '✅ Listo para importar' as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN public.user_institutions ui ON pu.id = ui.user_id AND ui.is_primary = true
LEFT JOIN public.institutions i ON ui.institution_id = i.id
LEFT JOIN public.users pu_email ON pu.email = pu_email.email AND pu.id != pu_email.id
WHERE au.id IS NULL  -- No existe en auth.users
  AND pu.email IS NOT NULL  -- Tiene email
  AND pu.email != ''  -- Email no está vacío
  AND pu.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'  -- Email válido
  AND (pu.role_id IS NULL OR r.id IS NOT NULL)  -- role_id válido o NULL
  AND pu_email.id IS NULL  -- No hay otro usuario con el mismo email
ORDER BY pu.email;

-- =====================================================
-- PASO 2: GENERAR JSON PARA SUPABASE ADMIN API (CON ID ESPECÍFICO)
-- =====================================================
-- ⚠️ CRÍTICO: Este JSON incluye el ID específico de public.users
-- para mantener la consistencia entre auth.users y public.users
SELECT 
    jsonb_agg(
        jsonb_build_object(
            'id', pu.id,  -- ⚠️ ID ESPECÍFICO de public.users
            'email', pu.email,
            'password', NULL,  -- Se debe generar o proporcionar
            'email_confirm', true,
            'user_metadata', jsonb_build_object(
                'first_name', pu.first_name,
                'last_name', pu.last_name,
                'role_id', pu.role_id,
                'institution_id', ui.institution_id,
                'identity_document', pu.identity_document,
                'identity_document_type', pu.identity_document_type
            )
        )
    ) as usuarios_json_para_admin_api
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN public.user_institutions ui ON pu.id = ui.user_id AND ui.is_primary = true
LEFT JOIN public.users pu_email ON pu.email = pu_email.email AND pu.id != pu_email.id
WHERE au.id IS NULL  -- Solo usuarios sin auth.users
  AND pu.email IS NOT NULL
  AND pu.email != ''
  AND pu.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  AND (pu.role_id IS NULL OR r.id IS NOT NULL)
  AND pu_email.id IS NULL
ORDER BY pu.email;

-- =====================================================
-- PASO 3: GENERAR JSON INDIVIDUAL PARA CADA USUARIO
-- =====================================================
-- Útil para crear usuarios uno por uno si hay problemas
SELECT 
    pu.id,
    pu.email,
    jsonb_build_object(
        'id', pu.id,
        'email', pu.email,
        'password', NULL,  -- Se debe generar o proporcionar
        'email_confirm', true,
        'user_metadata', jsonb_build_object(
            'first_name', pu.first_name,
            'last_name', pu.last_name,
            'role_id', pu.role_id,
            'institution_id', ui.institution_id,
            'identity_document', pu.identity_document,
            'identity_document_type', pu.identity_document_type
        )
    ) as json_individual
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
LEFT JOIN public.roles r ON pu.role_id = r.id
LEFT JOIN public.user_institutions ui ON pu.id = ui.user_id AND ui.is_primary = true
LEFT JOIN public.users pu_email ON pu.email = pu_email.email AND pu.id != pu_email.id
WHERE au.id IS NULL
  AND pu.email IS NOT NULL
  AND pu.email != ''
  AND pu.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  AND (pu.role_id IS NULL OR r.id IS NOT NULL)
  AND pu_email.id IS NULL
ORDER BY pu.email;

-- =====================================================
-- INSTRUCCIONES PARA CREAR USUARIOS
-- =====================================================
--
-- OPCIÓN 1: Usar Supabase Admin API (RECOMENDADO)
--
-- 1. Copiar el JSON generado en PASO 2
-- 2. Para cada usuario, hacer una llamada con el ID específico:
--
--    curl -X POST \
--      https://[PROJECT].supabase.co/auth/v1/admin/users \
--      -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
--      -H "Content-Type: application/json" \
--      -d '{
--        "id": "69c36c20-c0bf-4cc3-ba64-9d5909f6831c",
--        "email": "usuario@ejemplo.com",
--        "password": "Password123!",
--        "email_confirm": true,
--        "user_metadata": {
--          "first_name": "Nombre",
--          "last_name": "Apellido",
--          "role_id": 3
--        }
--      }'
--
-- ⚠️ IMPORTANTE: Incluir el campo "id" en el JSON para mantener consistencia
--
-- OPCIÓN 2: Usar Supabase Dashboard
--
-- 1. Ir a Authentication > Users
-- 2. Clic en "Add User"
-- 3. ⚠️ NO se puede especificar el ID manualmente en el dashboard
-- 4. Después de crear, actualizar el ID manualmente o usar la API
--
-- OPCIÓN 3: Usar Edge Function (si existe)
--
-- 1. Verificar que la Edge Function soporte el campo "id"
-- 2. Si no lo soporta, modificar la función para aceptar IDs específicos
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
        WHEN au.id != pu.id THEN '⚠️ ID diferente (PROBLEMA)'
        WHEN au.email != pu.email THEN '⚠️ Email diferente (PROBLEMA)'
        ELSE '✅ Creado correctamente en auth.users'
    END as estado,
    au.id as auth_id,
    au.email as auth_email
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id OR au.email = pu.email
WHERE pu.id IN (
    -- Lista de IDs que intentaste crear
    SELECT pu2.id
    FROM public.users pu2
    LEFT JOIN auth.users au2 ON pu2.id = au2.id
    WHERE au2.id IS NULL
      AND pu2.email IS NOT NULL
      AND pu2.email != ''
      AND pu2.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
)
ORDER BY pu.email;

-- =====================================================
-- SOLUCIÓN DE PROBLEMAS COMUNES
-- =====================================================
--
-- PROBLEMA: "User already exists"
-- SOLUCIÓN: El usuario ya existe en auth.users con ese email pero ID diferente
--           Ejecutar corregir_problemas_antes_importar.sql primero
--
-- PROBLEMA: "Invalid email"
-- SOLUCIÓN: El email no es válido. Verificar con diagnostico_problemas_importacion_usuarios.sql
--
-- PROBLEMA: "ID already exists"
-- SOLUCIÓN: El ID ya existe en auth.users. Verificar si es el mismo usuario o un duplicado
--
-- PROBLEMA: Usuario creado pero con ID diferente
-- SOLUCIÓN: No se especificó el ID al crear. Eliminar y recrear con el ID correcto

