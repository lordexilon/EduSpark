-- =====================================================
-- MEJORAR LIMPIEZA DE CHUNKS: ELIMINAR RUIDO SIN PERDER CONTENIDO VÁLIDO
-- Limpia secuencias de números repetitivos pero mantiene contenido válido
-- =====================================================

-- Función mejorada para limpiar ruido preservando contenido válido
CREATE OR REPLACE FUNCTION clean_ocr_text_preserve_content(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned TEXT;
  lines TEXT[];
  line TEXT;
  cleaned_lines TEXT[];
  words TEXT[];
  word TEXT;
  cleaned_words TEXT[];
  has_valid_content BOOLEAN;
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN '';
  END IF;
  
  cleaned := input_text;
  
  -- 1. Eliminar caracteres de control
  cleaned := regexp_replace(cleaned, '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '', 'g');
  
  -- 2. Eliminar caracteres Unicode problemáticos
  cleaned := regexp_replace(cleaned, '[\u200B-\u200D\uFEFF\u00AD]', '', 'g');
  
  -- 3. Normalizar espacios
  cleaned := regexp_replace(cleaned, '[ \t]+', ' ', 'g');
  cleaned := regexp_replace(cleaned, '\n{3,}', E'\n\n', 'g');
  
  -- 4. Procesar línea por línea
  lines := string_to_array(cleaned, E'\n');
  cleaned_lines := ARRAY[]::TEXT[];
  
  FOREACH line IN ARRAY lines
  LOOP
    line := trim(line);
    
    -- Saltar líneas vacías
    IF line = '' THEN
      CONTINUE;
    END IF;
    
    -- Si la línea es muy corta (menos de 3 caracteres), mantenerla solo si tiene letras
    IF length(line) < 3 THEN
      IF line ~ '[a-zA-Z]' THEN
        cleaned_lines := array_append(cleaned_lines, line);
      END IF;
      CONTINUE;
    END IF;
    
    -- NUEVA ESTRATEGIA: Limpiar secuencias repetitivas de números PERO mantener palabras válidas
    -- Dividir en palabras
    words := string_to_array(line, ' ');
    cleaned_words := ARRAY[]::TEXT[];
    has_valid_content := false;
    
    FOREACH word IN ARRAY words
    LOOP
      word := trim(word);
      
      -- Si la palabra es una secuencia repetitiva de números (más de 5 repeticiones), eliminarla
      IF word ~ '^(\d)\1{5,}$' THEN
        CONTINUE; -- Saltar esta palabra
      END IF;
      
      -- Si la palabra es solo números repetidos cortos (menos de 5 repeticiones), mantenerla
      -- Puede ser parte de contenido válido (ej: "222" en una fórmula)
      
      -- Si la palabra tiene letras o es un número normal, mantenerla
      IF word ~ '[a-zA-Z]' OR word ~ '^\d+$' OR length(word) > 0 THEN
        cleaned_words := array_append(cleaned_words, word);
        IF word ~ '[a-zA-Z]' THEN
          has_valid_content := true;
        END IF;
      END IF;
    END LOOP;
    
    -- Reconstruir la línea
    line := array_to_string(cleaned_words, ' ');
    
    -- Solo mantener la línea si:
    -- 1. Tiene contenido válido (letras), O
    -- 2. Tiene al menos 3 palabras (probablemente contenido válido), O
    -- 3. Tiene menos del 80% de números/caracteres especiales
    IF has_valid_content 
       OR array_length(cleaned_words, 1) >= 3
       OR (
         length(line) >= 10 AND
         (SELECT COUNT(*)::REAL / GREATEST(length(line), 1)
          FROM regexp_split_to_table(line, '') AS char
          WHERE char ~ '[a-zA-Z]') > 0.2  -- Al menos 20% letras
       ) THEN
      cleaned_lines := array_append(cleaned_lines, line);
    END IF;
  END LOOP;
  
  -- Reconstruir el texto
  cleaned := array_to_string(cleaned_lines, E'\n');
  
  -- Limpiar espacios al inicio y final
  cleaned := trim(cleaned);
  
  RETURN cleaned;
END;
$$;

-- =====================================================
-- LIMPIAR CHUNKS EXISTENTES PRESERVANDO CONTENIDO VÁLIDO
-- =====================================================

-- Ver estadísticas antes de limpiar
SELECT 
  'Antes de limpieza' as etapa,
  COUNT(*) as total_chunks,
  SUM(LENGTH(content)) as caracteres_totales,
  COUNT(*) FILTER (WHERE content ~ '(\d)\1{5,}') as chunks_con_secuencias_repetitivas
FROM course_content_chunks
WHERE content IS NOT NULL AND content != '';

-- Limpiar chunks que tienen secuencias repetitivas de números
-- pero preservando el contenido válido
UPDATE course_content_chunks
SET 
  content = clean_ocr_text_preserve_content(content)
WHERE 
  content IS NOT NULL 
  AND content != ''
  AND (
    -- Solo limpiar chunks que tienen secuencias repetitivas problemáticas
    content ~ '(\d)\1{5,}'  -- Secuencias de números repetidos (más de 5)
    OR content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'  -- Caracteres de control
    OR content ~ '[\u200B-\u200D\uFEFF\u00AD]'  -- Caracteres Unicode problemáticos
  )
  -- NO limpiar chunks que ya fueron marcados como limpios
  AND (metadata->>'cleaned' IS NULL OR (metadata->>'cleaned')::boolean = false);

-- Marcar chunks como limpiados
UPDATE course_content_chunks
SET 
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"cleaned": true}'::jsonb
WHERE 
  content IS NOT NULL 
  AND content != ''
  AND (
    content ~ '(\d)\1{5,}'
    OR content ~ '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]'
    OR content ~ '[\u200B-\u200D\uFEFF\u00AD]'
  );

-- Ver estadísticas después de limpiar
SELECT 
  'Después de limpieza' as etapa,
  COUNT(*) as total_chunks,
  SUM(LENGTH(content)) as caracteres_totales,
  COUNT(*) FILTER (WHERE content ~ '(\d)\1{5,}') as chunks_con_secuencias_repetitivas,
  COUNT(*) FILTER (WHERE content ~ '[a-zA-Z]') as chunks_con_contenido_valido
FROM course_content_chunks
WHERE content IS NOT NULL AND content != '';

-- Verificar que no se perdió contenido válido importante
-- (chunks que mencionan nombres de matemáticos o conceptos importantes)
SELECT 
  'Chunks con contenido válido preservado' as descripcion,
  COUNT(*) as total
FROM course_content_chunks
WHERE 
  content IS NOT NULL 
  AND content != ''
  AND (
    content ILIKE '%dedekind%'
    OR content ILIKE '%cantor%'
    OR content ILIKE '%weierstrass%'
    OR content ILIKE '%bolzano%'
    OR content ILIKE '%matemático%'
    OR content ILIKE '%número%'
    OR content ILIKE '%teorema%'
  );

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. Esta función es más conservadora: solo elimina secuencias repetitivas
--    pero preserva contenido válido incluso si tiene algo de ruido
-- 2. No elimina chunks completos, solo limpia el contenido
-- 3. Mantiene palabras con letras y números normales
-- 4. Solo elimina secuencias repetitivas de números (ej: "77777777")
-- 5. Para limpiar solo chunks de un curso específico, agregar:
--    AND course_id = ID_DEL_CURSO

