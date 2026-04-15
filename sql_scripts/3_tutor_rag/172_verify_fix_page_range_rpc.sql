-- =====================================================
-- VERIFICAR Y CORREGIR FUNCIÓN RPC PARA BÚSQUEDA POR RANGO DE PÁGINAS
-- Esta función debe retornar embedding para compatibilidad con ragService.ts
--
-- ⚠️ IMPORTANTE: Antes de ejecutar este script, ejecutar:
--    172_backup_page_range_rpc.sql  (para hacer backup)
--
-- Si necesitas revertir, ejecutar:
--    172_restore_page_range_rpc.sql  (para restaurar desde backup)
-- =====================================================

-- Verificar si hay backup disponible
DO $$
DECLARE
  v_has_backup BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = '_function_backups'
  ) INTO v_has_backup;

  IF NOT v_has_backup THEN
    RAISE NOTICE '⚠️ ADVERTENCIA: No se encontró tabla de backups. Se recomienda ejecutar 172_backup_page_range_rpc.sql primero.';
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM _function_backups 
      WHERE function_name = 'get_chunks_in_page_range'
    ) INTO v_has_backup;
    
    IF NOT v_has_backup THEN
      RAISE NOTICE '⚠️ ADVERTENCIA: No hay backup de esta función. Se recomienda ejecutar 172_backup_page_range_rpc.sql primero.';
    ELSE
      RAISE NOTICE '✅ Backup encontrado. Puedes restaurar con 172_restore_page_range_rpc.sql si es necesario.';
    END IF;
  END IF;
END $$;

-- Primero, verificar si la función existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_chunks_in_page_range'
  ) THEN
    RAISE NOTICE 'La función get_chunks_in_page_range ya existe. Se reemplazará.';
  ELSE
    RAISE NOTICE 'La función get_chunks_in_page_range no existe. Se creará.';
  END IF;
END $$;

-- Crear o reemplazar la función con embedding incluido
CREATE OR REPLACE FUNCTION get_chunks_in_page_range(
  p_course_id INTEGER,
  p_page_start INTEGER,
  p_page_end INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  embedding VECTOR(768),
  chunk_index INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.embedding,
    ccc.chunk_index
  FROM course_content_chunks ccc
  WHERE 
    -- 1. Pertenecen al curso
    ccc.course_id = p_course_id
    -- 2. Están en el rango de páginas (usando metadatos)
    AND (
      -- Caso A: Metadata tiene pageStart/pageEnd (formato actual)
      (
        (ccc.metadata->>'pageStart') IS NOT NULL
        AND (ccc.metadata->>'pageEnd') IS NOT NULL
        AND (
          -- El rango del chunk se solapa con el rango buscado
          ((ccc.metadata->>'pageStart')::int <= p_page_end)
          AND ((ccc.metadata->>'pageEnd')::int >= p_page_start)
        )
      )
      OR
      -- Caso B: Metadata tiene page_start/page_end (formato alternativo)
      (
        (ccc.metadata->>'page_start') IS NOT NULL
        AND (ccc.metadata->>'page_end') IS NOT NULL
        AND (
          ((ccc.metadata->>'page_start')::int <= p_page_end)
          AND ((ccc.metadata->>'page_end')::int >= p_page_start)
        )
      )
    )
  ORDER BY 
    -- Priorizar chunks que empiezan dentro del rango
    CASE 
      WHEN (ccc.metadata->>'pageStart') IS NOT NULL 
        AND ((ccc.metadata->>'pageStart')::int >= p_page_start 
          AND (ccc.metadata->>'pageStart')::int <= p_page_end)
        THEN 1
      WHEN (ccc.metadata->>'page_start') IS NOT NULL
        AND ((ccc.metadata->>'page_start')::int >= p_page_start 
          AND (ccc.metadata->>'page_start')::int <= p_page_end)
        THEN 1
      ELSE 2
    END,
    ccc.chunk_index ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_chunks_in_page_range IS 
'Obtiene chunks dentro de un rango de páginas específico para un curso. Retorna chunks cuyo rango de páginas se solapa con el rango buscado.';

-- Verificar que la función se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_chunks_in_page_range'
  ) THEN
    RAISE NOTICE '✅ Función get_chunks_in_page_range creada/reemplazada exitosamente.';
  ELSE
    RAISE EXCEPTION '❌ Error: La función no se creó correctamente.';
  END IF;
END $$;

-- Script de prueba (opcional, descomentar para probar)
/*
-- Ejemplo de uso:
SELECT * FROM get_chunks_in_page_range(
  p_course_id := 1,  -- Reemplazar con ID de curso real
  p_page_start := 241,
  p_page_end := 262,
  p_limit := 10
);

-- Verificar metadata de chunks existentes
SELECT 
  id,
  metadata->>'pageStart' as page_start,
  metadata->>'pageEnd' as page_end,
  metadata->>'sourceFileName' as file_name,
  LEFT(content, 100) as content_preview
FROM course_content_chunks
WHERE course_id = 1  -- Reemplazar con ID de curso real
  AND (metadata->>'pageStart') IS NOT NULL
LIMIT 10;
*/

