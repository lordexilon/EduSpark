-- 44_test_user_registration.sql
-- Script para verificar que el sistema de registro de usuarios funciona correctamente
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- VERIFICACIÓN DEL TRIGGER DE USUARIOS
-- =====================================================

-- 1. Verificar que el trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Verificar que la función handle_new_user existe
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- =====================================================
-- VERIFICACIÓN DE ROLES
-- =====================================================

-- 3. Verificar que los roles están configurados correctamente
SELECT 
  id,
  name,
  description
FROM public.roles
ORDER BY id;

-- Resultado esperado:
-- id | name    | description
-- ---|---------|-------------
-- 1  | admin   | Administrador
-- 2  | teacher | Docente
-- 3  | student | Estudiante

-- =====================================================
-- VERIFICACIÓN DE POLÍTICAS RLS
-- =====================================================

-- 4. Verificar políticas RLS para users
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- VERIFICACIÓN DE USUARIOS EXISTENTES
-- =====================================================

-- 5. Ver usuarios y sus roles
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  u.is_active,
  u.created_at
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.created_at DESC
LIMIT 10;

-- =====================================================
-- VERIFICACIÓN DE FUNCIONALIDAD
-- =====================================================

-- 6. Verificar que el trigger funciona correctamente
-- (Este test se ejecuta cuando se crea un usuario desde el frontend)

-- Para probar manualmente:
-- 1. Crear un usuario desde el frontend con registro
-- 2. Verificar que se creó en auth.users
-- 3. Verificar que se creó automáticamente en public.users con el rol correcto

-- =====================================================
-- NOTAS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Verificación del sistema de registro de usuarios';
  RAISE NOTICE '';
  RAISE NOTICE 'Funcionalidades esperadas:';
  RAISE NOTICE '1. Registro público: Solo puede crear usuarios con rol "student" (ID: 3)';
  RAISE NOTICE '2. Administradores: Pueden crear usuarios con cualquier rol';
  RAISE NOTICE '3. Trigger automático: Crea registro en public.users cuando se crea en auth.users';
  RAISE NOTICE '4. El rol se asigna desde user_metadata en el registro';
  RAISE NOTICE '';
  RAISE NOTICE 'Para probar:';
  RAISE NOTICE '- Registro público en /login (sin autenticación) → crea estudiante';
  RAISE NOTICE '- Administrador autenticado puede elegir el rol';
END $$;

