-- 86_diagnostico_campos_reales.sql
-- Diagnosticar los campos REALES de las tablas course_units y sessions

-- 1. Ver estructura REAL de course_units
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_units'
ORDER BY ordinal_position;

-- 2. Ver estructura REAL de sessions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sessions'
ORDER BY ordinal_position;

-- 3. Ver DATOS REALES de la unidad del curso 1
SELECT * FROM course_units WHERE course_id = 1;

-- 4. Ver DATOS REALES de las sesiones del curso 1
SELECT * FROM sessions WHERE course_id = 1;

-- 5. Verificar si hay error de column name
SELECT 
  id,
  number,
  title,
  description,
  objective
FROM sessions 
WHERE course_id = 1;

