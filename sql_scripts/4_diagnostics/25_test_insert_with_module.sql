-- 25_test_insert_with_module.sql
-- Probar insertar con module_id

INSERT INTO public.course_materials (course_id, module_id, title, type, content, file_url)
VALUES (9, 5, 'Test con module_id', 'text', 'Contenido de prueba', NULL)
RETURNING *;

