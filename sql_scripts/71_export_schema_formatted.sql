-- =====================================================
-- Script para exportar el esquema en formato legible
-- Este script genera un formato más estructurado para documentación
-- =====================================================

-- Crear una función temporal para generar CREATE TABLE statements
CREATE OR REPLACE FUNCTION get_table_definition(table_name_param TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := 'CREATE TABLE ' || table_name_param || ' (';
    col_record RECORD;
    first_col BOOLEAN := true;
BEGIN
    FOR col_record IN 
        SELECT 
            c.column_name,
            c.data_type,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.is_nullable,
            c.column_default,
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
            result := result || E',\n    ';
        ELSE
            result := result || E'\n    ';
            first_col := false;
        END IF;
        
        result := result || col_record.column_name || ' ';
        
        -- Tipo de dato
        IF col_record.data_type = 'character varying' THEN
            result := result || 'VARCHAR(' || col_record.character_maximum_length || ')';
        ELSIF col_record.data_type = 'character' THEN
            result := result || 'CHAR(' || col_record.character_maximum_length || ')';
        ELSIF col_record.data_type = 'numeric' THEN
            result := result || 'DECIMAL(' || col_record.numeric_precision || ',' || COALESCE(col_record.numeric_scale, 0) || ')';
        ELSIF col_record.data_type = 'timestamp without time zone' THEN
            result := result || 'TIMESTAMP';
        ELSIF col_record.data_type = 'timestamp with time zone' THEN
            result := result || 'TIMESTAMPTZ';
        ELSIF col_record.data_type = 'USER-DEFINED' THEN
            SELECT t.typname INTO result
            FROM pg_type t
            JOIN information_schema.columns c2 ON c2.udt_name = t.typname
            WHERE c2.column_name = col_record.column_name 
                AND c2.table_name = table_name_param
            LIMIT 1;
            result := col_record.column_name || ' ' || (SELECT typname FROM pg_type WHERE oid = (
                SELECT atttypid FROM pg_attribute WHERE attrelid = (
                    SELECT oid FROM pg_class WHERE relname = table_name_param
                ) AND attname = col_record.column_name
            ));
            -- Fallback simple
            result := col_record.column_name || ' TEXT'; -- Por defecto para tipos personalizados
            CONTINUE;
        ELSE
            result := result || UPPER(col_record.data_type);
        END IF;
        
        -- NOT NULL
        IF col_record.is_nullable = 'NO' THEN
            result := result || ' NOT NULL';
        END IF;
        
        -- DEFAULT
        IF col_record.column_default IS NOT NULL THEN
            result := result || ' DEFAULT ' || col_record.column_default;
        END IF;
        
        -- PRIMARY KEY
        IF col_record.is_primary_key THEN
            result := result || ' PRIMARY KEY';
        END IF;
    END LOOP;
    
    result := result || E'\n);';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generar definiciones de todas las tablas
DO $$
DECLARE
    table_record RECORD;
    def TEXT;
BEGIN
    RAISE NOTICE E'\n\n=== DEFINICIONES DE TABLAS ===\n';
    
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        RAISE NOTICE E'\n-- Tabla: %\n', table_record.table_name;
        BEGIN
            -- Obtener estructura básica
            SELECT 
                'CREATE TABLE ' || table_record.table_name || ' (' || E'\n    ' ||
                string_agg(
                    column_name || ' ' || 
                    CASE 
                        WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                        WHEN data_type = 'numeric' THEN 'DECIMAL(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
                        WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                        WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                        WHEN data_type = 'integer' THEN 'INTEGER'
                        WHEN data_type = 'bigint' THEN 'BIGINT'
                        WHEN data_type = 'boolean' THEN 'BOOLEAN'
                        WHEN data_type = 'text' THEN 'TEXT'
                        WHEN data_type = 'uuid' THEN 'UUID'
                        WHEN data_type = 'jsonb' THEN 'JSONB'
                        WHEN data_type = 'ARRAY' THEN 
                            (SELECT typname FROM pg_type WHERE oid = (
                                SELECT typelem FROM pg_type WHERE typname = (
                                    SELECT udt_name FROM information_schema.columns 
                                    WHERE table_name = table_record.table_name 
                                        AND column_name = c.column_name
                                )
                            )) || '[]'
                        ELSE UPPER(data_type)
                    END ||
                    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                    E',\n    ' ORDER BY ordinal_position
                ) || E'\n);'
            INTO def
            FROM information_schema.columns c
            WHERE table_schema = 'public' 
                AND table_name = table_record.table_name
            GROUP BY table_name;
            
            RAISE NOTICE '%', def;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error generando definición para %: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Mostrar Foreign Keys
SELECT 
    E'\n=== FOREIGN KEYS ===\n' as output
UNION ALL
SELECT 
    E'\n-- ' || tc.table_name || 
    E'\nALTER TABLE ' || tc.table_name || 
    ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' FOREIGN KEY (' || kcu.column_name || ') ' ||
    'REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ')' ||
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN ' ON DELETE CASCADE'
        WHEN rc.delete_rule = 'SET NULL' THEN ' ON DELETE SET NULL'
        WHEN rc.delete_rule = 'RESTRICT' THEN ' ON DELETE RESTRICT'
        ELSE ''
    END || ';'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Mostrar políticas RLS
SELECT 
    E'\n=== POLÍTICAS RLS ===\n' as output
UNION ALL
SELECT 
    E'\n-- Política: ' || policyname || ' en ' || tablename ||
    E'\nCREATE POLICY "' || policyname || '"' ||
    E'\nON public.' || tablename ||
    E'\nFOR ' || cmd ||
    CASE 
        WHEN qual IS NOT NULL THEN E'\nUSING (' || qual || ')'
        ELSE ''
    END ||
    CASE 
        WHEN with_check IS NOT NULL THEN E'\nWITH CHECK (' || with_check || ')'
        ELSE ''
    END || ';'
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Limpiar función temporal
DROP FUNCTION IF EXISTS get_table_definition(TEXT);

