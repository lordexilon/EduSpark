-- 150_grant_permissions_reset_functions.sql
-- Otorgar permisos de ejecución a las funciones de reset de progreso
-- Asegura que administradores, coordinadores y docentes puedan ejecutar estas funciones
--
-- Fecha: Enero 2025
-- Descripción: Permisos de seguridad para funciones de reset de progreso

-- =====================================================
-- OTORGAR PERMISOS DE EJECUCIÓN
-- =====================================================

-- Permitir a usuarios autenticados ejecutar las funciones de reset
-- Nota: Las funciones usan SECURITY DEFINER y validan permisos internamente
GRANT EXECUTE ON FUNCTION public.reset_student_course_progress(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_multiple_students_course_progress(UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_students_course_progress(INTEGER) TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que los permisos se otorgaron correctamente
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') 
        THEN '✅ Permiso otorgado' 
        ELSE '❌ Sin permiso' 
    END as permission_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'reset_student_course_progress',
    'reset_multiple_students_course_progress',
    'reset_all_students_course_progress'
  )
ORDER BY p.proname;

