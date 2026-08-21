-- DIAGNÓSTICO: Verificación de Tablas y Funciones de Presupuesto
-- Copia y ejecuta este script en Supabase SQL Editor

-- 1. Verificar Tablas
SELECT 
    table_name,
    'public' as schema_name,
    'TABLA EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tutor_cost_tracking', 'tutor_cost_limits');

-- 2. Verificar Funciones
SELECT 
    routine_name,
    routine_type,
    'FUNCIÓN EXISTE' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('check_tutor_cost_limit', 'track_tutor_interaction_cost', 'get_user_cost_stats');

-- 3. Verificar Columnas (si las tablas existen)
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('tutor_cost_tracking', 'tutor_cost_limits')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
