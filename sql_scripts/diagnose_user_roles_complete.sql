-- =====================================================
-- Script: Diagnóstico Completo de Roles de Usuarios
-- Descripción: Verifica el estado actual de roles y usuarios
-- Fecha: 2025-12-01
-- =====================================================

-- PASO 1: Verificar los roles disponibles y sus IDs
SELECT 
  'PASO 1: Roles Disponibles' as paso,
  id,
  name,
  description,
  created_at
FROM public.roles
ORDER BY id;

-- PASO 2: Contar usuarios por rol
SELECT 
  'PASO 2: Distribución de Usuarios por Rol' as paso,
  r.id as role_id,
  r.name as role_name,
  COUNT(u.id) as total_usuarios
FROM public.roles r
LEFT JOIN public.users u ON u.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.id;

-- PASO 3: Ver todos los usuarios con sus roles
SELECT 
  'PASO 3: Usuarios y Roles Actuales' as paso,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name,
  r.id as role_table_id,
  u.is_active,
  u.created_at
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;

-- PASO 4: Identificar usuarios con role_id que no coincide con ningún rol
SELECT 
  'PASO 4: Usuarios con role_id Inválido' as paso,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  'ROL NO ENCONTRADO' as role_name
FROM public.users u
WHERE u.role_id IS NULL 
   OR NOT EXISTS (
     SELECT 1 FROM public.roles r WHERE r.id = u.role_id
   );

-- PASO 5: Verificar el trigger que crea usuarios
SELECT 
  'PASO 5: Trigger de Creación de Usuarios' as paso,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_schema = 'auth';

-- PASO 6: Verificar la función handle_new_user
SELECT 
  'PASO 6: Función handle_new_user' as paso,
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- PASO 7: Verificar usuarios recientes creados (últimos 10)
SELECT 
  'PASO 7: Usuarios Recientes (Últimos 10)' as paso,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name,
  u.created_at,
  CASE 
    WHEN r.name = 'student' THEN '⚠️ Estudiante'
    WHEN r.name = 'admin' THEN '✅ Admin'
    WHEN r.name = 'teacher' THEN '👨‍🏫 Teacher'
    WHEN r.name = 'admin-campus' THEN '🏛️ Admin Campus'
    WHEN r.name = 'coordinator' THEN '📋 Coordinator'
    WHEN r.name = 'supervisor' THEN '👁️ Supervisor'
    ELSE '❓ Rol Desconocido'
  END as estado
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.created_at DESC
LIMIT 10;

-- PASO 8: Verificar si hay usuarios admin que aparecen como estudiantes
SELECT 
  'PASO 8: Posibles Admins con Rol Incorrecto' as paso,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id as current_role_id,
  r_current.name as current_role_name,
  (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1) as admin_role_id,
  (SELECT name FROM public.roles WHERE name = 'admin' LIMIT 1) as admin_role_name,
  CASE 
    WHEN u.email ILIKE '%admin%' OR u.email ILIKE '%administrador%' THEN '⚠️ Email sugiere admin'
    WHEN r_current.name = 'student' THEN '⚠️ Actualmente es estudiante'
    ELSE '✅ OK'
  END as observacion
FROM public.users u
LEFT JOIN public.roles r_current ON u.role_id = r_current.id
WHERE (
  u.email ILIKE '%admin%' 
  OR u.email ILIKE '%administrador%'
  OR r_current.name = 'student'
)
ORDER BY u.email;

-- PASO 9: Verificar políticas RLS en la tabla users
SELECT 
  'PASO 9: Políticas RLS de Users' as paso,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

-- PASO 10: Verificar funciones helper de roles
SELECT 
  'PASO 10: Funciones Helper de Roles' as paso,
  routine_name,
  routine_type,
  data_type as return_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_admin',
    'is_supervisor',
    'is_admin_campus',
    'is_coordinator',
    'is_teacher',
    'is_student'
  )
ORDER BY routine_name;

-- =====================================================
-- RESUMEN Y RECOMENDACIONES
-- =====================================================

/*
INSTRUCCIONES:

1. Ejecuta este script completo en Supabase SQL Editor
2. Revisa cada paso para identificar problemas:
   - PASO 1: Verifica que todos los roles existan
   - PASO 2: Verifica la distribución (si todos tienen role_id = 1, hay problema)
   - PASO 3: Revisa usuarios específicos y sus roles
   - PASO 4: Identifica usuarios con role_id inválido
   - PASO 5-6: Verifica el trigger y función que crea usuarios
   - PASO 7: Revisa usuarios recientes
   - PASO 8: Identifica posibles admins con rol incorrecto
   - PASO 9: Verifica políticas RLS
   - PASO 10: Verifica funciones helper

3. Si encuentras problemas:
   - Usuarios con role_id incorrecto: Usa fix_admin_role_quick.sql
   - Trigger con default incorrecto: Corrige handle_new_user()
   - Políticas RLS bloqueando: Revisa las políticas

4. Para corregir un usuario específico:
   UPDATE public.users
   SET role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
   WHERE email = 'tu-email@ejemplo.com';
*/

