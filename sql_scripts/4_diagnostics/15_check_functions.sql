-- 15_check_functions.sql
-- Verificar que las funciones necesarias existen

-- Ver si la función is_admin_or_teacher existe
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('is_admin', 'is_teacher', 'is_admin_or_teacher')
ORDER BY p.proname;

