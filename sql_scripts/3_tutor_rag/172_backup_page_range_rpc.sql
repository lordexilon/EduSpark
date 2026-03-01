-- =====================================================
-- BACKUP DE LA FUNCIÓN RPC get_chunks_in_page_range
-- Ejecutar ANTES de 172_verify_fix_page_range_rpc.sql
-- Este script guarda la definición actual de la función
-- =====================================================

-- Crear tabla temporal para guardar backup (solo si no existe)
CREATE TABLE IF NOT EXISTS _function_backups (
  function_name TEXT PRIMARY KEY,
  definition TEXT NOT NULL,
  backed_up_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Eliminar backup anterior si existe
DELETE FROM _function_backups WHERE function_name = 'get_chunks_in_page_range';

-- Guardar la definición actual de la función si existe
DO $$
DECLARE
  v_definition TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si la función existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_chunks_in_page_range'
  ) INTO v_exists;

  IF v_exists THEN
    -- Obtener la definición de la función
    SELECT pg_get_functiondef(oid)::TEXT
    INTO v_definition
    FROM pg_proc
    WHERE proname = 'get_chunks_in_page_range'
    ORDER BY oid DESC  -- Tomar la más reciente si hay múltiples overloads
    LIMIT 1;

    -- Guardar en tabla de backup
    INSERT INTO _function_backups (function_name, definition, notes)
    VALUES (
      'get_chunks_in_page_range',
      v_definition,
      'Backup automático antes de aplicar 172_verify_fix_page_range_rpc.sql'
    );

    RAISE NOTICE '✅ Backup guardado exitosamente en _function_backups';
    RAISE NOTICE 'Función respaldada: get_chunks_in_page_range';
  ELSE
    RAISE NOTICE '⚠️ La función get_chunks_in_page_range no existe. No hay nada que respaldar.';
  END IF;
END $$;

-- Mostrar el backup guardado
SELECT 
  function_name,
  backed_up_at,
  notes,
  LEFT(definition, 200) || '...' as definition_preview
FROM _function_backups
WHERE function_name = 'get_chunks_in_page_range';

