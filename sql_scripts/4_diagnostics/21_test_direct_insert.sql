-- 21_test_direct_insert.sql
-- Probar insertar directamente un material

-- Primero verificar si eres admin
SELECT auth.uid() as current_user_id, public.is_admin() as is_admin;

-- Insertar material de prueba
INSERT INTO public.course_materials (course_id, module_id, title, type, content, file_url)
VALUES (9, 5, 'Material de Prueba', 'text', 'Contenido de prueba', NULL)
RETURNING *;

