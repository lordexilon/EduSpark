-- =====================================================
-- Script: Corregir roles de usuarios
-- Descripción: Verifica y corrige los roles asignados a los usuarios
-- Fecha: 2025-12-01
-- =====================================================

-- 1. Verificar los IDs de los roles en la base de datos
SELECT 
  'IDs de Roles' as verificacion,
  id,
  name,
  description
FROM public.roles
ORDER BY id;

-- 2. Verificar usuarios y sus roles actuales
SELECT 
  'Usuarios y Roles Actuales' as verificacion,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name,
  r.id as role_table_id
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;

-- 3. Identificar usuarios con roles incorrectos
-- Buscar usuarios que deberían ser admin pero tienen otro rol
SELECT 
  'Usuarios que deberían ser admin' as verificacion,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id as current_role_id,
  r_current.name as current_role_name,
  r_admin.id as admin_role_id,
  r_admin.name as admin_role_name
FROM public.users u
LEFT JOIN public.roles r_current ON u.role_id = r_current.id
CROSS JOIN (SELECT id, name FROM public.roles WHERE name = 'admin' LIMIT 1) r_admin
WHERE u.email LIKE '%admin%' 
   OR u.email LIKE '%administrador%'
   OR (r_current.name IS NOT NULL AND r_current.name != 'admin')
ORDER BY u.email;

-- 4. Obtener el ID del rol 'admin'
DO $$
DECLARE
  v_admin_role_id INTEGER;
  v_student_role_id INTEGER;
  v_supervisor_role_id INTEGER;
BEGIN
  -- Obtener IDs de roles
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;
  SELECT id INTO v_student_role_id FROM public.roles WHERE name = 'student' LIMIT 1;
  SELECT id INTO v_supervisor_role_id FROM public.roles WHERE name = 'supervisor' LIMIT 1;
  
  -- Mostrar los IDs encontrados
  RAISE NOTICE 'Admin role ID: %', v_admin_role_id;
  RAISE NOTICE 'Student role ID: %', v_student_role_id;
  RAISE NOTICE 'Supervisor role ID: %', v_supervisor_role_id;
  
  -- Si no se encontró el rol admin, crear un error
  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el rol "admin" en la tabla roles';
  END IF;
  
  -- Corregir usuarios que deberían ser admin
  -- Ajusta esta condición según tus criterios (por ejemplo, emails específicos)
  UPDATE public.users
  SET role_id = v_admin_role_id
  WHERE (
    -- Usuarios con email que contiene 'admin' o 'administrador'
    (email ILIKE '%admin%' OR email ILIKE '%administrador%')
    -- Y que NO sean estudiantes o supervisores
    AND role_id != v_student_role_id
    AND (v_supervisor_role_id IS NULL OR role_id != v_supervisor_role_id)
    -- Y que actualmente NO sean admin
    AND role_id != v_admin_role_id
  )
  OR (
    -- O usuarios específicos que conozcas que deberían ser admin
    -- Añade aquí los emails de tus administradores
    email IN (
      'tu-admin@ejemplo.com',
      'otro-admin@ejemplo.com'
    )
    AND role_id != v_admin_role_id
  );
  
  RAISE NOTICE 'Usuarios actualizados a admin: %', SQL%ROWCOUNT;
END $$;

-- 5. Verificar usuarios después de la corrección
SELECT 
  'Usuarios después de corrección' as verificacion,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email ILIKE '%admin%' OR u.email ILIKE '%administrador%'
ORDER BY u.email;

-- 6. Verificar el trigger que crea usuarios
SELECT 
  'Trigger de creación de usuarios' as verificacion,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 7. Verificar la función del trigger
SELECT 
  'Función handle_new_user' as verificacion,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';

-- 8. Si el trigger está usando role_id = 3 como default y debería usar otro, 
--    aquí está el script para corregirlo:
--    (Descomenta y ajusta según el ID correcto del rol 'student')

/*
-- Corregir el trigger para usar el ID correcto del rol 'student'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_student_role_id INTEGER;
BEGIN
  -- Obtener el ID del rol 'student'
  SELECT id INTO v_student_role_id 
  FROM public.roles 
  WHERE name = 'student' 
  LIMIT 1;
  
  -- Si no se encuentra, usar un valor por defecto seguro
  IF v_student_role_id IS NULL THEN
    RAISE WARNING 'No se encontró el rol "student", usando NULL para role_id';
  END IF;
  
  INSERT INTO public.users (id, email, first_name, last_name, role_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      (new.raw_user_meta_data->>'role_id')::integer, 
      v_student_role_id  -- Usar el ID correcto del rol student
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. Este script verifica los roles de los usuarios y corrige aquellos que deberían ser admin.

2. Ajusta la condición en el paso 4 para identificar correctamente a tus administradores:
   - Puedes usar emails específicos
   - O criterios basados en otros campos

3. El trigger `handle_new_user()` puede estar usando un ID incorrecto para el rol 'student'.
   Si es así, descomenta y ejecuta el paso 8 para corregirlo.

4. Para verificar qué ID tiene cada rol, ejecuta:
   SELECT id, name FROM public.roles ORDER BY id;

5. Para corregir manualmente un usuario específico:
   UPDATE public.users 
   SET role_id = (SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1)
   WHERE email = 'tu-email@ejemplo.com';

6. Si todos los usuarios tienen role_id = 1 y el rol 'student' tiene id = 1,
   entonces el problema puede ser que el rol 'admin' tiene un ID diferente.
   Verifica con: SELECT * FROM public.roles;
*/

