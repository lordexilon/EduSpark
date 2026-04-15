-- 24_check_course_materials_columns.sql
-- Verificar las columnas de course_materials

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'course_materials'
ORDER BY ordinal_position;

