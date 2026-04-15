-- sql_scripts/migrate_users_to_auth.sql
-- Script para migrar usuarios de public.users a auth.users
-- IMPORTANTE: Este script requiere ejecutarse con permisos de superusuario
-- o usar la API Admin de Supabase

-- =====================================================
-- OPCIÓN 1: Verificar usuarios que necesitan migración
-- =====================================================
-- Ejecuta esto primero para ver cuántos usuarios necesitan migración

SELECT 
  pu.id,
  pu.email,
  pu.first_name,
  pu.last_name,
  pu.identity_document,
  CASE 
    WHEN au.id IS NULL THEN '❌ NO EXISTE en auth.users'
    ELSE '✅ EXISTE en auth.users'
  END as estado_auth
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
ORDER BY pu.created_at DESC;

-- =====================================================
-- OPCIÓN 2: Listar usuarios para migración con contraseñas
-- =====================================================
-- Esta consulta te dará la información necesaria para crear usuarios via Admin API

SELECT 
  pu.id as user_id,
  pu.email,
  pu.first_name,
  pu.last_name,
  pu.identity_document as password_suggested, -- Usamos el documento como contraseña
  pu.identity_document_type
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
  AND pu.email IS NOT NULL
ORDER BY pu.created_at DESC;

-- =====================================================
-- NOTA IMPORTANTE
-- =====================================================
-- 
-- Para crear usuarios en auth.users, hay DOS opciones:
--
-- A) Usar la Edge Function createBulkUsers (ya existe en el proyecto):
--    1. Desplegar la función: supabase functions deploy createBulkUsers
--    2. Usar la página de importación masiva para re-importar
--
-- B) Usar Supabase Admin API directamente:
--    Ejecutar desde código backend o Edge Function:
--    
--    await supabase.auth.admin.createUser({
--      email: 'usuario@ejemplo.com',
--      password: 'contraseña',
--      email_confirm: true,
--      user_metadata: { first_name: 'Nombre', last_name: 'Apellido' }
--    });
--
-- =====================================================
-- OPCIÓN 3: Script para crear usuarios usando SQL puro
-- (SOLO FUNCIONA si tienes acceso directo a auth schema)
-- =====================================================

-- ADVERTENCIA: Este método NO es recomendado oficialmente por Supabase
-- Solo usar si tienes acceso de superusuario y sabes lo que haces

/*
-- Habilitar acceso al schema auth (requiere superusuario)
GRANT USAGE ON SCHEMA auth TO postgres;

-- Insertar usuario directamente en auth.users
-- NOTA: La contraseña debe estar hasheada con bcrypt
-- Por eso es mejor usar la Admin API

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  aud,
  role
)
SELECT 
  pu.id,
  '00000000-0000-0000-0000-000000000000'::uuid, -- instance_id por defecto
  pu.email,
  crypt(pu.identity_document, gen_salt('bf')), -- Hash bcrypt de la contraseña
  NOW(), -- email_confirmed_at
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('first_name', pu.first_name, 'last_name', pu.last_name),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
  AND pu.email IS NOT NULL;
*/

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

SELECT 
  COUNT(*) FILTER (WHERE au.id IS NOT NULL) as usuarios_con_auth,
  COUNT(*) FILTER (WHERE au.id IS NULL) as usuarios_sin_auth,
  COUNT(*) as total_usuarios
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id;
