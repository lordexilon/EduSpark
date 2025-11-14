-- 17_test_update_directly.sql
-- Probar actualizar directamente para ver el error

-- Primero, obtener el módulo 5
SELECT * FROM public.course_modules WHERE id = 5;

-- Verificar si eres admin
SELECT auth.uid() as current_user_id, public.is_admin() as is_admin;

-- Intentar actualizar (esto debería funcionar si eres admin)
UPDATE public.course_modules 
SET 
  name = 'Anatomía',
  title = 'Anatomía',
  description = 'Test',
  "order" = 5
WHERE id = 5
RETURNING *;

