-- 54_verify_and_fix_user_roles.sql
-- Verifica usuarios con roles y detecta posibles inconsistencias
-- Ejecutar en el SQL Editor de Supabase

-- =====================================================
-- PASO 1: LISTAR TODOS LOS USUARIOS Y SUS ROLES
-- =====================================================

SELECT 
  'Usuarios y sus roles actuales' as verificacion,
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role_id,
  r.name as role_name,
  r.description as role_description,
  u.created_at,
  CASE 
    WHEN u.role_id IS NULL THEN '⚠️ SIN ROL ASIGNADO'
    WHEN r.id IS NULL THEN '❌ ROL NO EXISTE'
    WHEN u.role_id = 1 THEN '✅ Estudiante (correcto para nuevo registro)'
    WHEN u.role_id = 2 THEN '👨‍🏫 Docente'
    WHEN u.role_id = 3 THEN '👑 Administrador'
    WHEN u.role_id = 4 THEN '📋 Coordinador'
    ELSE '⚠️ Rol desconocido'
  END as estado_rol
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
ORDER BY u.created_at DESC;

-- =====================================================
-- PASO 2: VERIFICAR USUARIOS SIN ROL
-- =====================================================

SELECT 
  'Usuarios sin rol asignado' as verificacion,
  COUNT(*) as usuarios_sin_rol
FROM public.users
WHERE role_id IS NULL;

-- =====================================================
-- PASO 3: VERIFICAR USUARIOS CON ROLES QUE NO EXISTEN
-- =====================================================

SELECT 
  'Usuarios con roles que no existen' as verificacion,
  u.id,
  u.email,
  u.role_id,
  u.created_at
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.role_id IS NOT NULL AND r.id IS NULL;

-- =====================================================
-- PASO 4: CORREGIR USUARIOS SIN ROL (asignar estudiante)
-- =====================================================

-- Actualizar usuarios sin rol asignado para que sean estudiantes
UPDATE public.users
SET role_id = 1, -- student
    updated_at = NOW()
WHERE role_id IS NULL;

-- =====================================================
-- PASO 5: CORREGIR USUARIOS CON ROLES QUE NO EXISTEN
-- =====================================================

-- Actualizar usuarios con roles que no existen para que sean estudiantes
UPDATE public.users u
SET role_id = 1, -- student
    updated_at = NOW()
WHERE u.role_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = u.role_id
  );

-- =====================================================
-- PASO 6: RESUMEN DE USUARIOS POR ROL
-- =====================================================

SELECT 
  'Resumen de usuarios por rol' as verificacion,
  r.id as role_id,
  r.name as role_name,
  COUNT(u.id) as total_usuarios,
  STRING_AGG(u.email, ', ') as usuarios_email
FROM public.roles r
LEFT JOIN public.users u ON r.id = u.role_id
GROUP BY r.id, r.name
ORDER BY r.id;

-- =====================================================
-- PASO 7: VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  'Verificación final' as verificacion,
  (SELECT COUNT(*) FROM public.users WHERE role_id IS NULL) as usuarios_sin_rol,
  (SELECT COUNT(*) FROM public.users u 
   LEFT JOIN public.roles r ON u.role_id = r.id 
   WHERE u.role_id IS NOT NULL AND r.id IS NULL) as usuarios_rol_invalido,
  (SELECT COUNT(*) FROM public.users WHERE role_id = 1) as total_estudiantes,
  (SELECT COUNT(*) FROM public.users WHERE role_id = 2) as total_docentes,
  (SELECT COUNT(*) FROM public.users WHERE role_id = 3) as total_admins,
  (SELECT COUNT(*) FROM public.users WHERE role_id = 4) as total_coordinadores;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

DO $$
DECLARE
  usuarios_sin_rol_count INTEGER;
  usuarios_rol_invalido_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO usuarios_sin_rol_count
  FROM public.users
  WHERE role_id IS NULL;
  
  SELECT COUNT(*) INTO usuarios_rol_invalido_count
  FROM public.users u
  LEFT JOIN public.roles r ON u.role_id = r.id
  WHERE u.role_id IS NOT NULL AND r.id IS NULL;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFICACIÓN DE USUARIOS Y ROLES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuarios sin rol: %', usuarios_sin_rol_count;
  RAISE NOTICE 'Usuarios con rol inválido: %', usuarios_rol_invalido_count;
  RAISE NOTICE '';
  
  IF usuarios_sin_rol_count > 0 THEN
    RAISE NOTICE '⚠️ Se corrigieron % usuario(s) sin rol (ahora son estudiantes)', usuarios_sin_rol_count;
  END IF;
  
  IF usuarios_rol_invalido_count > 0 THEN
    RAISE NOTICE '⚠️ Se corrigieron % usuario(s) con rol inválido (ahora son estudiantes)', usuarios_rol_invalido_count;
  END IF;
  
  IF usuarios_sin_rol_count = 0 AND usuarios_rol_invalido_count = 0 THEN
    RAISE NOTICE '✅ Todos los usuarios tienen roles válidos.';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Recordatorio:';
  RAISE NOTICE '   - Todos los nuevos usuarios se crean como estudiantes (role_id: 1)';
  RAISE NOTICE '   - Solo un administrador puede cambiar roles después del registro';
  RAISE NOTICE '';
END $$;

