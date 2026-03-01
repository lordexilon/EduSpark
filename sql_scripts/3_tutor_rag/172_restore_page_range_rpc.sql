-- =====================================================
-- RESTAURAR FUNCIÓN RPC get_chunks_in_page_range DESDE BACKUP
-- Ejecutar SOLO si necesitas revertir los cambios de 172_verify_fix_page_range_rpc.sql
-- =====================================================

DO $$
DECLARE
  v_backup_exists BOOLEAN;
  v_definition TEXT;
BEGIN
  -- Verificar si existe un backup
  SELECT EXISTS (
    SELECT 1 FROM _function_backups 
    WHERE function_name = 'get_chunks_in_page_range'
  ) INTO v_backup_exists;

  IF NOT v_backup_exists THEN
    RAISE EXCEPTION '❌ No se encontró backup de la función get_chunks_in_page_range. No se puede restaurar.';
  END IF;

  -- Obtener la definición del backup
  SELECT definition
  INTO v_definition
  FROM _function_backups
  WHERE function_name = 'get_chunks_in_page_range'
  ORDER BY backed_up_at DESC
  LIMIT 1;

  -- Ejecutar la definición para restaurar la función
  EXECUTE v_definition;

  RAISE NOTICE '✅ Función get_chunks_in_page_range restaurada exitosamente desde backup';
  RAISE NOTICE 'Backup usado fue creado el: %', (
    SELECT backed_up_at::TEXT 
    FROM _function_backups 
    WHERE function_name = 'get_chunks_in_page_range'
    ORDER BY backed_up_at DESC
    LIMIT 1
  );
END $$;

-- Verificar que la función fue restaurada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_chunks_in_page_range'
  ) THEN
    RAISE NOTICE '✅ Verificación: La función get_chunks_in_page_range existe después de la restauración.';
  ELSE
    RAISE EXCEPTION '❌ Error: La función no existe después de la restauración.';
  END IF;
END $$;

