-- =====================================================
-- Script simplificado para generar documentación del esquema
-- Genera un formato legible para actualizar schema_actual.md
-- =====================================================

-- =====================================================
-- LISTADO DE TODAS LAS TABLAS CON SUS COLUMNAS
-- =====================================================

-- Para cada tabla, mostrar todas sus columnas con detalles
DO $$
DECLARE
    table_rec RECORD;
    col_rec RECORD;
    output_text TEXT := '';
    table_output TEXT;
BEGIN
    output_text := E'\n\n# =====================================================\n';
    output_text := output_text || '# ESQUEMA COMPLETO DE LA BASE DE DATOS\n';
    output_text := output_text || '# Generado automáticamente\n';
    output_text := output_text || '# =====================================================\n\n';
    
    FOR table_rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        table_output := E'\n### Tabla: `' || table_rec.table_name || '`\n';
        table_output := table_output || '```sql\n';
        table_output := table_output || 'CREATE TABLE ' || table_rec.table_name || ' (\n';
        
        FOR col_rec IN 
            SELECT 
                c.column_name,
                CASE 
                    WHEN c.data_type = 'character varying' THEN 
                        'VARCHAR(' || c.character_maximum_length || ')'
                    WHEN c.data_type = 'numeric' THEN 
                        'DECIMAL(' || c.numeric_precision || ',' || COALESCE(c.numeric_scale, 0) || ')'
                    WHEN c.data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                    WHEN c.data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                    WHEN c.data_type = 'integer' THEN 'INTEGER'
                    WHEN c.data_type = 'bigint' THEN 'BIGINT'
                    WHEN c.data_type = 'smallint' THEN 'SMALLINT'
                    WHEN c.data_type = 'boolean' THEN 'BOOLEAN'
                    WHEN c.data_type = 'text' THEN 'TEXT'
                    WHEN c.data_type = 'uuid' THEN 'UUID'
                    WHEN c.data_type = 'jsonb' THEN 'JSONB'
                    WHEN c.data_type = 'ARRAY' THEN 
                        (SELECT 
                            CASE 
                                WHEN e.data_type = 'text' THEN 'TEXT[]'
                                WHEN e.data_type = 'integer' THEN 'INTEGER[]'
                                ELSE UPPER(e.data_type) || '[]'
                            END
                         FROM information_schema.element_types e
                         WHERE e.object_schema = 'public'
                            AND e.object_name = c.table_name
                            AND e.object_type = 'TABLE'
                            AND e.collection_type_identifier = 
                                (SELECT dtd_identifier 
                                 FROM information_schema.columns 
                                 WHERE table_name = c.table_name 
                                    AND column_name = c.column_name)
                         LIMIT 1)
                    WHEN c.udt_name IN ('_text', '_varchar') THEN 'TEXT[]'
                    WHEN c.udt_name LIKE '%[]' THEN UPPER(REPLACE(c.udt_name, '_', ' ')) || '[]'
                    ELSE UPPER(c.data_type)
                END as data_type,
                c.is_nullable,
                c.column_default,
                CASE WHEN pk.constraint_name IS NOT NULL THEN true ELSE false END as is_primary_key
            FROM information_schema.columns c
            LEFT JOIN (
                SELECT kcu.column_name, kcu.table_name, tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
            ) pk ON c.column_name = pk.column_name AND c.table_name = pk.table_name
            WHERE c.table_schema = 'public' 
                AND c.table_name = table_rec.table_name
            ORDER BY c.ordinal_position
        LOOP
            IF col_rec.column_name != (SELECT column_name FROM information_schema.columns 
                                       WHERE table_name = table_rec.table_name 
                                       ORDER BY ordinal_position LIMIT 1) THEN
                table_output := table_output || ',\n';
            END IF;
            
            table_output := table_output || '    ' || col_rec.column_name || ' ' || col_rec.data_type;
            
            -- PRIMARY KEY
            IF col_rec.is_primary_key THEN
                table_output := table_output || ' PRIMARY KEY';
            END IF;
            
            -- NOT NULL (si no es PK, porque PK ya implica NOT NULL)
            IF col_rec.is_nullable = 'NO' AND NOT col_rec.is_primary_key THEN
                table_output := table_output || ' NOT NULL';
            END IF;
            
            -- DEFAULT
            IF col_rec.column_default IS NOT NULL THEN
                table_output := table_output || ' DEFAULT ' || col_rec.column_default;
            END IF;
        END LOOP;
        
        -- Agregar Foreign Keys
        table_output := table_output || E'\n);\n```\n';
        
        -- Foreign Keys para esta tabla
        FOR col_rec IN 
            SELECT 
                kcu.column_name,
                ccu.table_name as referenced_table,
                ccu.column_name as referenced_column,
                rc.delete_rule
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.referential_constraints rc
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND kcu.table_name = table_rec.table_name
            ORDER BY kcu.column_name
        LOOP
            table_output := table_output || E'\n**Foreign Key:** `' || col_rec.column_name || 
                           '` REFERENCES `' || col_rec.referenced_table || 
                           '`(`' || col_rec.referenced_column || '`)';
            IF col_rec.delete_rule != 'NO ACTION' THEN
                table_output := table_output || ' ON DELETE ' || col_rec.delete_rule;
            END IF;
            table_output := table_output || '\n';
        END LOOP;
        
        -- Constraints CHECK
        FOR col_rec IN 
            SELECT 
                cc.constraint_name,
                cc.check_clause
            FROM information_schema.check_constraints cc
            JOIN information_schema.constraint_column_usage ccu
                ON cc.constraint_name = ccu.constraint_name
            WHERE ccu.table_schema = 'public'
                AND ccu.table_name = table_rec.table_name
            ORDER BY cc.constraint_name
        LOOP
            table_output := table_output || E'\n**Constraint:** `' || col_rec.constraint_name || 
                           '` CHECK (' || col_rec.check_clause || ')\n';
        END LOOP;
        
        -- Índices
        FOR col_rec IN 
            SELECT DISTINCT
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
                AND tablename = table_rec.table_name
                AND indexname NOT LIKE '%_pkey'
                AND indexname NOT LIKE '%_fkey'
            ORDER BY indexname
        LOOP
            table_output := table_output || E'\n**Índice:** `' || col_rec.indexname || 
                           '` - ' || col_rec.indexdef || '\n';
        END LOOP;
        
        output_text := output_text || table_output;
        RAISE NOTICE '%', table_output;
    END LOOP;
    
    RAISE NOTICE E'\n\n=== RESUMEN ===\n';
    RAISE NOTICE 'Total de tablas: %', (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    );
END $$;

-- =====================================================
-- LISTADO DE POLÍTICAS RLS
-- =====================================================
SELECT 
    E'\n=== POLÍTICAS RLS PARA ' || tablename || ' ===\n' ||
    '**Política:** `' || policyname || '`\n' ||
    '- **Comando:** ' || cmd || '\n' ||
    CASE WHEN qual IS NOT NULL THEN '- **USING:** ' || qual || '\n' ELSE '' END ||
    CASE WHEN with_check IS NOT NULL THEN '- **WITH CHECK:** ' || with_check || '\n' ELSE '' END
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- LISTADO DE FUNCIONES
-- =====================================================
SELECT 
    E'\n=== FUNCIÓN: ' || p.proname || ' ===\n' ||
    '**Parámetros:** ' || pg_get_function_arguments(p.oid) || '\n' ||
    '**Retorna:** ' || pg_get_function_result(p.oid) || '\n'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
ORDER BY p.proname;

-- =====================================================
-- LISTADO DE TRIGGERS
-- =====================================================
SELECT 
    E'\n=== TRIGGER: ' || trigger_name || ' ===\n' ||
    '**Tabla:** ' || event_object_table || '\n' ||
    '**Evento:** ' || action_timing || ' ' || event_manipulation || '\n' ||
    '**Acción:** ' || action_statement || '\n'
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

