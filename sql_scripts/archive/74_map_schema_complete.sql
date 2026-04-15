-- =====================================================
-- Script para mapear completamente el esquema de la base de datos
-- Ejecutar en Supabase SQL Editor
-- Copiar los resultados y actualizar schema_actual.md
-- =====================================================

-- =====================================================
-- 1. LISTAR TODAS LAS TABLAS
-- =====================================================
SELECT 
    'TABLE' as type,
    table_name as name,
    '' as details,
    '' as extra
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =====================================================
-- 2. COLUMNAS DE CADA TABLA (formato legible)
-- =====================================================
SELECT 
    'COLUMN' as type,
    c.table_name as name,
    c.column_name || ' ' ||
    CASE 
        WHEN c.data_type = 'character varying' THEN 
            'VARCHAR(' || c.character_maximum_length || ')'
        WHEN c.data_type = 'numeric' THEN 
            'DECIMAL(' || c.numeric_precision || ',' || COALESCE(c.numeric_scale, 0) || ')'
        WHEN c.data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
        WHEN c.data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
        WHEN c.data_type = 'integer' THEN 'INTEGER'
        WHEN c.data_type = 'bigint' THEN 'BIGINT'
        WHEN c.data_type = 'boolean' THEN 'BOOLEAN'
        WHEN c.data_type = 'text' THEN 'TEXT'
        WHEN c.data_type = 'uuid' THEN 'UUID'
        WHEN c.data_type = 'jsonb' THEN 'JSONB'
        WHEN c.udt_name LIKE '%[]' OR c.udt_name = '_text' THEN 'TEXT[]'
        ELSE UPPER(c.data_type)
    END ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END ||
    CASE WHEN pk.column_name IS NOT NULL THEN ' PRIMARY KEY' ELSE '' END as details,
    'Ordinal: ' || c.ordinal_position as extra
FROM information_schema.columns c
LEFT JOIN (
    SELECT kcu.column_name, kcu.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.column_name = pk.column_name AND c.table_name = pk.table_name
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;

-- =====================================================
-- 3. FOREIGN KEYS
-- =====================================================
SELECT 
    'FOREIGN_KEY' as type,
    kcu.table_name as name,
    kcu.column_name || ' REFERENCES ' || 
    ccu.table_name || '(' || ccu.column_name || ')' ||
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN ' ON DELETE CASCADE'
        WHEN rc.delete_rule = 'SET NULL' THEN ' ON DELETE SET NULL'
        WHEN rc.delete_rule = 'RESTRICT' THEN ' ON DELETE RESTRICT'
        ELSE ''
    END as details,
    'Constraint: ' || tc.constraint_name as extra
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY kcu.table_name, kcu.column_name;

-- =====================================================
-- 4. UNIQUE CONSTRAINTS
-- =====================================================
SELECT 
    'UNIQUE' as type,
    kcu.table_name as name,
    kcu.column_name as details,
    'Constraint: ' || tc.constraint_name as extra
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
ORDER BY kcu.table_name, kcu.column_name;

-- =====================================================
-- 5. CHECK CONSTRAINTS
-- =====================================================
SELECT 
    'CHECK' as type,
    ccu.table_name as name,
    cc.check_clause as details,
    'Constraint: ' || cc.constraint_name as extra
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu
    ON cc.constraint_name = ccu.constraint_name
WHERE ccu.table_schema = 'public'
ORDER BY ccu.table_name, cc.constraint_name;

-- =====================================================
-- 6. ÍNDICES
-- =====================================================
SELECT 
    'INDEX' as type,
    tablename as name,
    indexname as details,
    indexdef as extra
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
    AND indexname NOT LIKE '%_fkey'
ORDER BY tablename, indexname;

-- =====================================================
-- 7. POLÍTICAS RLS
-- =====================================================
SELECT 
    'RLS_POLICY' as type,
    tablename as name,
    policyname || ' - ' || cmd as details,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE ''
    END ||
    CASE 
        WHEN with_check IS NOT NULL THEN 
            CASE WHEN qual IS NOT NULL THEN ' | WITH CHECK: ' ELSE 'WITH CHECK: ' END || with_check
        ELSE ''
    END as extra
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 8. FUNCIONES
-- =====================================================
SELECT 
    'FUNCTION' as type,
    p.proname as name,
    pg_get_function_arguments(p.oid) as details,
    'Returns: ' || pg_get_function_result(p.oid) as extra
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
ORDER BY p.proname;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================
SELECT 
    'TRIGGER' as type,
    event_object_table as name,
    trigger_name as details,
    action_timing || ' ' || event_manipulation || ' - ' || action_statement as extra
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 10. RESUMEN ESTADÍSTICO
-- =====================================================
SELECT 
    'STATS' as type,
    'RESUMEN' as name,
    'Total de tablas: ' || (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    )::TEXT ||
    ' | Total de políticas RLS: ' || (
        SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'
    )::TEXT ||
    ' | Total de funciones: ' || (
        SELECT COUNT(*) 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind = 'f'
    )::TEXT ||
    ' | Total de triggers: ' || (
        SELECT COUNT(*) 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    )::TEXT as details,
    '' as extra;

