-- =====================================================
-- LIMPIEZA DE CHUNKS EXISTENTES CON RUIDO DE OCR
-- Este script limpia el contenido de chunks que ya fueron procesados
-- aplicando las mismas reglas de limpieza que la función cleanOCRText()
-- =====================================================

-- Función para limpiar texto OCR (equivalente a cleanOCRText en TypeScript)
CREATE OR REPLACE FUNCTION clean_ocr_text(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned TEXT;
  lines TEXT[];
  line TEXT;
  cleaned_lines TEXT[];
  non_alpha_numeric_count INTEGER;
  numeric_or_special_count INTEGER;
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN '';
  END IF;
  
  cleaned := input_text;
  
  -- 1. Eliminar caracteres de control (caracteres no imprimibles)
  -- Esto incluye: \x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F-\x9F
  cleaned := regexp_replace(cleaned, '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', 'g');
  
  -- 2. Eliminar secuencias repetitivas de números (más de 4 repeticiones)
  -- Ejemplo: "77777777" -> "", "222222222" -> ""
  cleaned := regexp_replace(cleaned, '(\d)\1{4,}', '', 'g');
  
  -- 2.1. Eliminar secuencias repetitivas más cortas (2-3 repeticiones) cuando están aisladas
  -- Ejemplo: "3 3 3" -> "", "22 22" -> ""
  cleaned := regexp_replace(cleaned, '\b(\d)\s+\1\s+\1\b', '', 'g');
  cleaned := regexp_replace(cleaned, '\b(\d)\s+\1\b', '', 'g');
  
  -- 2.2. Eliminar patrones de números aislados repetitivos (ej: "3 7 3 2 3 2 3 22 3 22")
  -- Esto elimina secuencias de números de 1-2 dígitos separados por espacios cuando hay muchos
  cleaned := regexp_replace(cleaned, '\b\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}\s+', '', 'g');
  
  -- 3. Eliminar secuencias repetitivas de caracteres no alfanuméricos (más de 3 repeticiones)
  -- Ejemplo: "####" -> "", "---" -> ""
  cleaned := regexp_replace(cleaned, '([^\w\s])\1{3,}', '', 'g');
  
  -- 3.1. Eliminar secuencias más cortas de caracteres especiales repetitivos
  cleaned := regexp_replace(cleaned, '([^\w\s])\s*\1\s*\1', '', 'g');
  
  -- 4. Normalizar espacios en blanco múltiples a un solo espacio
  cleaned := regexp_replace(cleaned, '[ \t]+', ' ', 'g');
  
  -- 5. Eliminar caracteres Unicode problemáticos
  cleaned := regexp_replace(cleaned, '[\u200B-\u200D\uFEFF\u00AD]', '', 'g');
  
  -- 6. Normalizar saltos de línea múltiples a máximo 2
  cleaned := regexp_replace(cleaned, '\n{3,}', E'\n\n', 'g');
  
  -- 7. Procesar línea por línea
  lines := string_to_array(cleaned, E'\n');
  cleaned_lines := ARRAY[]::TEXT[];
  
  FOREACH line IN ARRAY lines
  LOOP
    line := trim(line);
    
    -- Si la línea está vacía, saltarla
    IF line = '' THEN
      CONTINUE;
    END IF;
    
    -- Si la línea solo tiene caracteres especiales, números repetidos o está vacía, eliminarla
    IF length(line) < 3 THEN
      -- Mantener líneas muy cortas (pueden ser válidas)
      cleaned_lines := array_append(cleaned_lines, line);
      CONTINUE;
    END IF;
    
    -- Si la línea solo tiene números y caracteres especiales y es corta, probablemente es ruido
    IF regexp_match(line, '^[\d\s\-_\.]+$') IS NOT NULL AND length(line) < 3 THEN
      CONTINUE;
    END IF;
    
    -- Si la línea tiene más del 50% de caracteres no alfanuméricos y es corta, probablemente es ruido
    non_alpha_numeric_count := (SELECT COUNT(*) FROM regexp_matches(line, '[^\w\s]', 'g'));
    IF length(line) > 0 AND (non_alpha_numeric_count::FLOAT / length(line)) > 0.5 AND length(line) < 10 THEN
      CONTINUE;
    END IF;
    
    -- Si más del 70% son números o caracteres especiales, probablemente es ruido
    numeric_or_special_count := (SELECT COUNT(*) FROM regexp_matches(line, '[\d\W]', 'g'));
    IF length(line) >= 3 AND (numeric_or_special_count::FLOAT / length(line)) > 0.7 THEN
      CONTINUE;
    END IF;
    
    -- Eliminar líneas que son principalmente números aislados separados por espacios
    -- Ejemplo: "3 7 3 2 3 22 3 22 1 22 3 222"
    IF regexp_match(line, '^(\d{1,3}\s+){5,}') IS NOT NULL THEN
      -- Si tiene 5+ números aislados seguidos, probablemente es ruido
      CONTINUE;
    END IF;
    
    -- Eliminar líneas con muchos números pequeños repetitivos
    -- Ejemplo: "3 3 3 22 22 22 55 55"
    IF (SELECT COUNT(*) FROM regexp_matches(line, '\b\d{1,2}\s+\d{1,2}\b', 'g')) > 3 THEN
      -- Si tiene más de 3 pares de números pequeños, probablemente es ruido
      CONTINUE;
    END IF;
    
    -- Si pasó todos los filtros, mantener la línea
    cleaned_lines := array_append(cleaned_lines, line);
  END LOOP;
  
  -- Reconstruir el texto
  cleaned := array_to_string(cleaned_lines, E'\n');
  
  -- Limpiar espacios al inicio y final
  cleaned := trim(cleaned);
  
  RETURN cleaned;
END;
$$;

-- =====================================================
-- LIMPIAR CHUNKS EXISTENTES
-- =====================================================

-- Ver cuántos chunks tienen ruido (antes de limpiar)
SELECT 
  'Chunks con posible ruido de OCR' as descripcion,
  COUNT(*) as total,
  SUM(LENGTH(content)) as caracteres_totales
FROM course_content_chunks
WHERE content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'  -- Caracteres de control
   OR content ~ '(\d)\1{4,}'  -- Secuencias repetitivas de números
   OR content ~ '([^\w\s])\1{3,}';  -- Secuencias repetitivas de caracteres especiales

-- Limpiar todos los chunks aplicando la función de limpieza
UPDATE course_content_chunks
SET 
  content = clean_ocr_text(content)
WHERE 
  -- Solo limpiar chunks que probablemente tienen ruido
  (
    content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'  -- Caracteres de control
    OR content ~ '(\d)\1{4,}'  -- Secuencias repetitivas de números
    OR content ~ '([^\w\s])\1{3,}'  -- Secuencias repetitivas de caracteres especiales
    OR content ~ '[\u200B-\u200D\uFEFF\u00AD]'  -- Caracteres Unicode problemáticos
  )
  AND content IS NOT NULL
  AND content != '';

-- Ver estadísticas después de la limpieza
SELECT 
  'Chunks limpiados' as descripcion,
  COUNT(*) as total_chunks,
  SUM(LENGTH(content)) as caracteres_totales,
  AVG(LENGTH(content)) as promedio_caracteres_por_chunk
FROM course_content_chunks
WHERE content IS NOT NULL AND content != '';

-- Verificar que no queden chunks con ruido
SELECT 
  'Chunks con ruido restante' as descripcion,
  COUNT(*) as total
FROM course_content_chunks
WHERE content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'  -- Caracteres de control
   OR content ~ '(\d)\1{4,}'  -- Secuencias repetitivas de números
   OR content ~ '([^\w\s])\1{3,}';  -- Secuencias repetitivas de caracteres especiales

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. Este script limpia TODOS los chunks que tienen ruido de OCR
-- 2. La función clean_ocr_text() replica la lógica de cleanOCRText() en TypeScript
-- 3. Los chunks se actualizan in-place (no se crean nuevos)
-- 4. Si necesitas limpiar solo chunks de un material específico, agrega:
--    AND metadata->>'material_id' = 'ID_DEL_MATERIAL'
-- 6. Si necesitas limpiar solo chunks de un curso específico, agrega:
--    AND course_id = ID_DEL_CURSO

