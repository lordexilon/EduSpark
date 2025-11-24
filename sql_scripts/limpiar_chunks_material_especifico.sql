-- =====================================================
-- LIMPIEZA DE CHUNKS DE UN MATERIAL ESPECÍFICO
-- Útil para limpiar chunks de un archivo específico que ya fue procesado
-- =====================================================

-- ⚠️ CAMBIAR ESTE VALOR por el material_id que quieres limpiar
-- Puedes obtenerlo de la tabla materials o del metadata de los chunks
DO $$
DECLARE
  material_id_to_clean TEXT := 'TU_MATERIAL_ID_AQUI';  -- ⚠️ CAMBIAR ESTE VALOR
  chunks_updated INTEGER;
BEGIN
  -- Verificar que la función existe
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'clean_ocr_text') THEN
    RAISE EXCEPTION 'La función clean_ocr_text no existe. Ejecuta primero limpiar_chunks_ocr_existentes.sql';
  END IF;
  
  -- Limpiar chunks del material específico
  UPDATE course_content_chunks
  SET 
    content = clean_ocr_text(content),
    updated_at = NOW()
  WHERE 
    metadata->>'material_id' = material_id_to_clean
    AND content IS NOT NULL
    AND content != ''
    AND (
      content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'  -- Caracteres de control
      OR content ~ '(\d)\1{4,}'  -- Secuencias repetitivas de números
      OR content ~ '([^\w\s])\1{3,}'  -- Secuencias repetitivas de caracteres especiales
    );
  
  GET DIAGNOSTICS chunks_updated = ROW_COUNT;
  
  RAISE NOTICE 'Chunks limpiados: %', chunks_updated;
END $$;

-- =====================================================
-- ALTERNATIVA: Limpiar por nombre de archivo
-- =====================================================

-- Si conoces el sourceFileId o sourceFileName, puedes usar esto:
/*
UPDATE course_content_chunks ccc
SET 
  content = clean_ocr_text(ccc.content),
  updated_at = NOW()
FROM materials m
WHERE 
  ccc.metadata->>'material_id' = m.id::text
  AND (m.metadata->>'sourceFileId' = 'TU_FILE_ID' OR m.title LIKE '%nombre_archivo%')
  AND ccc.content IS NOT NULL
  AND ccc.content != ''
  AND (
    ccc.content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'
    OR ccc.content ~ '(\d)\1{4,}'
    OR ccc.content ~ '([^\w\s])\1{3,}'
  );
*/

-- =====================================================
-- VERIFICAR MATERIALES DISPONIBLES
-- =====================================================

-- Listar materiales con chunks que tienen ruido
SELECT 
  m.id as material_id,
  m.title as material_title,
  COUNT(ccc.id) as total_chunks,
  COUNT(CASE 
    WHEN ccc.content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'
      OR ccc.content ~ '(\d)\1{4,}'
      OR ccc.content ~ '([^\w\s])\1{3,}'
    THEN 1 
  END) as chunks_con_ruido
FROM materials m
INNER JOIN course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.rag_status = 'completed'
GROUP BY m.id, m.title
HAVING COUNT(CASE 
  WHEN ccc.content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'
    OR ccc.content ~ '(\d)\1{4,}'
    OR ccc.content ~ '([^\w\s])\1{3,}'
  THEN 1 
END) > 0
ORDER BY chunks_con_ruido DESC;

