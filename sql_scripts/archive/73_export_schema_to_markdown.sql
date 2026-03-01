-- =====================================================
-- Script para exportar el esquema completo a formato Markdown
-- Ejecutar en Supabase SQL Editor y copiar el resultado
-- =====================================================

-- Este script genera un output estructurado que puedes copiar directamente
-- al archivo schema_actual.md

\echo ''
\echo '====================================================='
\echo 'ESQUEMA COMPLETO DE LA BASE DE DATOS - EduSpark'
\echo '====================================================='
\echo ''

-- Crear una función para formatear el tipo de dato
CREATE OR REPLACE FUNCTION format_data_type(
    col_name TEXT,
    data_type TEXT,
    char_max_len INTEGER,
    num_precision INTEGER,
    num_scale INTEGER,
    udt_name TEXT
) RETURNS TEXT AS $$
BEGIN
    CASE 
        WHEN data_type = 'character varying' THEN 
            RETURN 'VARCHAR(' || char_max_len || ')';
        WHEN data_type = 'character' THEN 
            RETURN 'CHAR(' || char_max_len || ')';
        WHEN data_type = 'numeric' THEN 
            RETURN 'DECIMAL(' || num_precision || ',' || COALESCE(num_scale, 0) || ')';
        WHEN data_type = 'timestamp without time zone' THEN 
            RETURN 'TIMESTAMP';
        WHEN data_type = 'timestamp with time zone' THEN 
            RETURN 'TIMESTAMPTZ';
        WHEN data_type = 'integer' THEN 
            RETURN 'INTEGER';
        WHEN data_type = 'bigint' THEN 
            RETURN 'BIGINT';
        WHEN data_type = 'smallint' THEN 
            RETURN 'SMALLINT';
        WHEN data_type = 'boolean' THEN 
            RETURN 'BOOLEAN';
        WHEN data_type = 'text' THEN 
            RETURN 'TEXT';
        WHEN data_type = 'uuid' THEN 
            RETURN 'UUID';
        WHEN data_type = 'jsonb' THEN 
            RETURN 'JSONB';
        WHEN udt_name LIKE '%[]' OR udt_name = '_text' OR udt_name = '_varchar' THEN
            RETURN 'TEXT[]';
        ELSE 
            RETURN UPPER(COALESCE(udt_name, data_type));
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Función para generar el CREATE TABLE completo
CREATE OR REPLACE FUNCTION generate_table_markdown(table_name_param TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    col_record RECORD;
    first_col BOOLEAN := true;
    pk_cols TEXT[];
    fk_info TEXT;
    constraint_info TEXT;
    index_info TEXT;
BEGIN
    result := E'\n### Tabla: `' || table_name_param || '`\n';
    result := result || '```sql\n';
    result := result || 'CREATE TABLE ' || table_name_param || ' (\n';
    
    -- Obtener columnas
    FOR col_record IN 
        SELECT 
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.is_nullable,
            c.column_default,
            c.udt_name,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT kcu.column_name, kcu.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name AND c.table_name = pk.table_name
        WHERE c.table_schema = 'public' 
            AND c.table_name = table_name_param
        ORDER BY c.ordinal_position
    LOOP
        IF NOT first_col THEN
            result := result || E',\n';
        END IF;
        result := result || '    ' || col_record.column_name || ' ';
        result := result || format_data_type(
            col_record.column_name,
            col_record.data_type,
            col_record.character_maximum_length,
            col_record.numeric_precision,
            col_record.numeric_scale,
            col_record.udt_name
        );
        
        IF col_record.is_primary_key THEN
            result := result || ' PRIMARY KEY';
        END IF;
        
        IF col_record.is_nullable = 'NO' AND NOT col_record.is_primary_key THEN
            result := result || ' NOT NULL';
        END IF;
        
        IF col_record.column_default IS NOT NULL THEN
            result := result || ' DEFAULT ' || col_record.column_default;
        END IF;
        
        first_col := false;
    END LOOP;
    
    result := result || E'\n);\n```\n';
    
    -- Agregar Foreign Keys
    FOR fk_info IN
        SELECT 
            E'\n**Foreign Key:** `' || kcu.column_name || 
            '` REFERENCES `' || ccu.table_name || 
            '`(`' || ccu.column_name || '`)' ||
            CASE 
                WHEN rc.delete_rule = 'CASCADE' THEN ' ON DELETE CASCADE'
                WHEN rc.delete_rule = 'SET NULL' THEN ' ON DELETE SET NULL'
                WHEN rc.delete_rule = 'RESTRICT' THEN ' ON DELETE RESTRICT'
                ELSE ''
            END
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc
            ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND kcu.table_name = table_name_param
        ORDER BY kcu.column_name
    LOOP
        result := result || fk_info || E'\n';
    END LOOP;
    
    -- Agregar Constraints CHECK
    FOR constraint_info IN
        SELECT 
            E'\n**Constraint:** `' || cc.constraint_name || 
            '` CHECK (' || cc.check_clause || ')'
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu
            ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_schema = 'public'
            AND ccu.table_name = table_name_param
        ORDER BY cc.constraint_name
    LOOP
        result := result || constraint_info || E'\n';
    END LOOP;
    
    -- Agregar Índices
    FOR index_info IN
        SELECT 
            E'\n**Índice:** `' || indexname || 
            '` - ' || indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
            AND tablename = table_name_param
            AND indexname NOT LIKE '%_pkey'
            AND indexname NOT LIKE '%_fkey'
        ORDER BY indexname
    LOOP
        result := result || index_info || E'\n';
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generar documentación para todas las tablas
DO $$
DECLARE
    table_rec RECORD;
    table_md TEXT;
    all_tables_md TEXT := '';
BEGIN
    all_tables_md := E'\n## 🗄️ Estructura de Base de Datos\n\n';
    
    FOR table_rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        table_md := generate_table_markdown(table_rec.table_name);
        all_tables_md := all_tables_md || table_md || E'\n';
        RAISE NOTICE '%', table_md;
    END LOOP;
    
    RAISE NOTICE E'\n\n=== TOTAL DE TABLAS: % ===\n', (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    );
END $$;

-- Mostrar políticas RLS
\echo ''
\echo '====================================================='
\echo 'POLÍTICAS RLS (ROW LEVEL SECURITY)'
\echo '====================================================='
\echo ''

SELECT 
    E'\n### Tabla: `' || tablename || '`\n' ||
    E'**Política:** `' || policyname || '`\n' ||
    E'- **Comando:** ' || cmd || E'\n' ||
    CASE WHEN qual IS NOT NULL THEN E'- **USING:** ' || qual || E'\n' ELSE '' END ||
    CASE WHEN with_check IS NOT NULL THEN E'- **WITH CHECK:** ' || with_check || E'\n' ELSE '' END
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Mostrar funciones
\echo ''
\echo '====================================================='
\echo 'FUNCIONES'
\echo '====================================================='
\echo ''

SELECT 
    E'\n### Función: `' || p.proname || '`\n' ||
    E'```sql\n' ||
    pg_get_functiondef(p.oid) ||
    E'\n```\n'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
ORDER BY p.proname;

-- Mostrar triggers
\echo ''
\echo '====================================================='
\echo 'TRIGGERS'
\echo '====================================================='
\echo ''

SELECT 
    E'\n### Trigger: `' || trigger_name || '`\n' ||
    E'**Tabla:** `' || event_object_table || '`\n' ||
    E'**Evento:** ' || action_timing || ' ' || event_manipulation || E'\n' ||
    E'**Acción:** ' || action_statement || E'\n'
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Limpiar funciones temporales
DROP FUNCTION IF EXISTS format_data_type(TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS generate_table_markdown(TEXT);

