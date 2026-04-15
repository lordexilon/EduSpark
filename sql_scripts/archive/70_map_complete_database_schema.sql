-- =====================================================
-- Script para mapear completamente el esquema de la base de datos
-- Genera un reporte completo para actualizar schema_actual.md
-- =====================================================

-- =====================================================
-- 1. INFORMACIÓN DE TABLAS Y COLUMNAS
-- =====================================================
SELECT 
    '=== TABLA ===' as section,
    t.table_schema,
    t.table_name,
    '' as column_info,
    '' as data_type,
    '' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- Detalles de columnas por tabla
SELECT 
    'COLUMN' as section,
    c.table_schema,
    c.table_name,
    c.column_name as column_info,
    c.data_type || 
    CASE 
        WHEN c.character_maximum_length IS NOT NULL 
        THEN '(' || c.character_maximum_length || ')'
        WHEN c.numeric_precision IS NOT NULL 
        THEN '(' || c.numeric_precision || ',' || COALESCE(c.numeric_scale, 0) || ')'
        ELSE ''
    END as data_type,
    CASE 
        WHEN c.is_nullable = 'NO' THEN 'NOT NULL'
        ELSE 'NULL'
    END as constraints,
    COALESCE(c.column_default, '') as default_value,
    c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;

-- =====================================================
-- 2. PRIMARY KEYS
-- =====================================================
SELECT 
    'PRIMARY_KEY' as section,
    tc.table_schema,
    tc.table_name,
    kcu.column_name as column_info,
    '' as data_type,
    'PRIMARY KEY' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;

-- =====================================================
-- 3. FOREIGN KEYS
-- =====================================================
SELECT 
    'FOREIGN_KEY' as section,
    tc.table_schema,
    tc.table_name,
    kcu.column_name || ' REFERENCES ' || 
    ccu.table_name || '(' || ccu.column_name || ')' ||
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN ' ON DELETE CASCADE'
        WHEN rc.delete_rule = 'SET NULL' THEN ' ON DELETE SET NULL'
        WHEN rc.delete_rule = 'RESTRICT' THEN ' ON DELETE RESTRICT'
        ELSE ''
    END as column_info,
    '' as data_type,
    'FOREIGN KEY' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 4. UNIQUE CONSTRAINTS
-- =====================================================
SELECT 
    'UNIQUE' as section,
    tc.table_schema,
    tc.table_name,
    kcu.column_name as column_info,
    '' as data_type,
    'UNIQUE' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 5. CHECK CONSTRAINTS
-- =====================================================
SELECT 
    'CHECK' as section,
    cc.table_schema,
    cc.table_name,
    cc.constraint_name as column_info,
    '' as data_type,
    cc.check_clause as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu
    ON cc.constraint_name = ccu.constraint_name
WHERE ccu.table_schema = 'public'
ORDER BY ccu.table_name, cc.constraint_name;

-- =====================================================
-- 6. ÍNDICES
-- =====================================================
SELECT 
    'INDEX' as section,
    schemaname as table_schema,
    tablename as table_name,
    indexname as column_info,
    indexdef as constraints,
    '' as data_type,
    '' as default_value,
    '' as is_nullable
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'  -- Excluir índices de PK
    AND indexname NOT LIKE '%_fkey'  -- Excluir índices de FK
ORDER BY tablename, indexname;

-- =====================================================
-- 7. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================
SELECT 
    'RLS_POLICY' as section,
    schemaname as table_schema,
    tablename as table_name,
    policyname as column_info,
    CASE 
        WHEN cmd = 'SELECT' THEN 'SELECT'
        WHEN cmd = 'INSERT' THEN 'INSERT'
        WHEN cmd = 'UPDATE' THEN 'UPDATE'
        WHEN cmd = 'DELETE' THEN 'DELETE'
        WHEN cmd = 'ALL' THEN 'ALL'
        ELSE cmd::text
    END as data_type,
    COALESCE(qual::text, '') as constraints,
    '' as default_value,
    '' as is_nullable
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 8. FUNCIONES
-- =====================================================
SELECT 
    'FUNCTION' as section,
    n.nspname as table_schema,
    '' as table_name,
    p.proname as column_info,
    pg_get_function_result(p.oid)::text as data_type,
    pg_get_function_arguments(p.oid) as constraints,
    '' as default_value,
    '' as is_nullable
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Solo funciones, no procedimientos
ORDER BY p.proname;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================
SELECT 
    'TRIGGER' as section,
    trigger_schema as table_schema,
    event_object_table as table_name,
    trigger_name as column_info,
    action_timing || ' ' || event_manipulation as data_type,
    action_statement as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 10. SECUENCIAS
-- =====================================================
SELECT 
    'SEQUENCE' as section,
    sequence_schema as table_schema,
    sequence_name as table_name,
    '' as column_info,
    data_type as data_type,
    '' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- =====================================================
-- 11. VISTAS
-- =====================================================
SELECT 
    'VIEW' as section,
    table_schema,
    table_name as table_name,
    '' as column_info,
    view_definition as data_type,
    '' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- RESUMEN ESTADÍSTICO
-- =====================================================

-- Conteo de tablas
SELECT 
    'STATS' as section,
    'public' as table_schema,
    'TOTAL_TABLES' as table_name,
    COUNT(*)::text as column_info,
    '' as data_type,
    '' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Conteo de políticas RLS
SELECT 
    'STATS' as section,
    'public' as table_schema,
    'TOTAL_RLS_POLICIES' as table_name,
    COUNT(*)::text as column_info,
    '' as data_type,
    '' as constraints,
    '' as default_value,
    '' as is_nullable
FROM pg_policies
WHERE schemaname = 'public';

-- Conteo de funciones
SELECT 
    'STATS' as section,
    'public' as table_schema,
    'TOTAL_FUNCTIONS' as table_name,
    COUNT(*)::text as column_info,
    '' as data_type,
    '' as constraints,
    '' as default_value,
    '' as is_nullable
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prokind = 'f';

-- Conteo de triggers
SELECT 
    'STATS' as section,
    'public' as table_schema,
    'TOTAL_TRIGGERS' as table_name,
    COUNT(*)::text as column_info,
    '' as data_type,
    '' as constraints,
    '' as default_value,
    '' as is_nullable
FROM information_schema.triggers
WHERE trigger_schema = 'public';

