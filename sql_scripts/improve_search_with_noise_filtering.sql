-- =====================================================
-- MEJORAS EN BÚSQUEDAS CON FILTRADO DE RUIDO
-- Elimina resultados irrelevantes y basura
-- =====================================================

-- Eliminar funciones existentes si existen (para evitar conflictos de tipos)
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(TEXT, INTEGER, INTEGER, REAL);
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(TEXT, INTEGER, INTEGER);

DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(TEXT, INTEGER, INTEGER, REAL);
DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(TEXT, INTEGER, INTEGER);

-- 1. Mejorar función de búsqueda de texto completo con filtrado de ruido
CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05  -- REDUCIDO: Más permisivo para encontrar contenido
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  rank DOUBLE PRECISION,
  relevance_score DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_words TEXT[];
  v_min_content_length INTEGER := 30; -- REDUCIDO: De 50 a 30 para no excluir chunks válidos
BEGIN
  -- Extraer palabras significativas de la consulta (mínimo 2 caracteres para nombres propios)
  v_query_words := ARRAY(
    SELECT word
    FROM unnest(string_to_array(lower(search_query), ' ')) AS word
    WHERE length(word) >= 2  -- REDUCIDO: De 3 a 2 para capturar nombres como "Dedekind"
  );
  
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.chunk_index,
    ts_rank(
      to_tsvector('spanish', ccc.content), 
      plainto_tsquery('spanish', search_query)
    ) as rank,
    -- Calcular score de relevancia mejorado
    (
      -- Score de texto completo (70%)
      COALESCE(
        ts_rank(
          to_tsvector('spanish', ccc.content), 
          plainto_tsquery('spanish', search_query)
        ), 
        0
      ) * 0.7 +
      -- Bonus por coincidencias de palabras clave (20%)
      (
        SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(array_length(v_query_words, 1), 1)
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      ) * 0.2 +
      -- Bonus por longitud de contenido válido (10%)
      CASE 
        WHEN length(ccc.content) >= v_min_content_length THEN 0.1
        ELSE 0
      END
    ) as relevance_score
  FROM course_content_chunks ccc
  WHERE ccc.course_id = course_id_param
    -- Filtrar contenido muy corto (probablemente ruido)
    AND length(ccc.content) >= v_min_content_length
    -- Filtrar contenido con demasiados caracteres especiales (ruido OCR)
    -- AJUSTADO: Aumentado a 50% para no excluir contenido válido con algo de ruido
    AND (
      SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
      FROM regexp_split_to_table(ccc.content, '') AS char
      WHERE char ~ '[^\w\s]'
    ) < 0.5  -- AUMENTADO: De 40% a 50% para ser más permisivo
    -- Filtrar contenido con demasiados números repetidos (ruido)
    -- AJUSTADO: Solo excluir si son secuencias repetitivas extremas
    AND NOT (
      -- Solo excluir si tiene secuencias repetitivas de números (más de 6 repeticiones)
      ccc.content ~ '(\d)\1{6,}'
      -- O si más del 80% son números Y tiene secuencias repetitivas
      OR (
        (SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
         FROM regexp_split_to_table(ccc.content, '') AS char
         WHERE char ~ '\d') > 0.8
        AND ccc.content ~ '(\d)\1{5,}'
      )
    )
    -- Búsqueda de texto completo (más flexible: busca palabras individuales si la búsqueda completa falla)
    AND (
      -- Primero intentar búsqueda de texto completo estándar
      to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query)
      OR
      -- Fallback 1: buscar palabras clave individuales (más permisivo)
      EXISTS (
        SELECT 1 
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      )
      OR
      -- Fallback 2: búsqueda case-insensitive directa (para nombres propios)
      lower(ccc.content) LIKE '%' || lower(search_query) || '%'
    )
    -- Filtrar chunks con metadata indicando que son ruido
    AND (ccc.metadata->>'is_noise' IS NULL OR (ccc.metadata->>'is_noise')::boolean = false)
  ORDER BY 
    -- Priorizar resultados con búsqueda de texto completo
    CASE 
      WHEN to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query) 
      THEN 1 
      ELSE 2 
    END,
    relevance_score DESC, 
    rank DESC NULLS LAST
  LIMIT result_limit;
END;
$$;

-- 2. Función híbrida mejorada con filtrado de ruido
CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05  -- REDUCIDO: Más permisivo para encontrar contenido
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  relevance_score DOUBLE PRECISION
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_query_words TEXT[];
  v_min_content_length INTEGER := 30;  -- REDUCIDO: De 50 a 30
BEGIN
  -- Extraer palabras significativas (mínimo 2 caracteres para nombres propios)
  v_query_words := ARRAY(
    SELECT word
    FROM unnest(string_to_array(lower(search_query), ' ')) AS word
    WHERE length(word) >= 2  -- REDUCIDO: De 3 a 2 para capturar nombres como "Dedekind"
  );
  
  RETURN QUERY
  SELECT 
    ccc.id,
    ccc.content,
    ccc.metadata,
    ccc.chunk_index,
    -- Score combinado mejorado
    (
      -- Texto completo (60%)
      COALESCE(
        ts_rank(
          to_tsvector('spanish', ccc.content), 
          plainto_tsquery('spanish', search_query)
        ), 
        0
      ) * 0.6 +
      -- Coincidencias de palabras clave (25%)
      (
        SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(array_length(v_query_words, 1), 1)
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      ) * 0.25 +
      -- Longitud válida (10%)
      CASE 
        WHEN length(ccc.content) >= v_min_content_length THEN 0.1
        ELSE 0
      END +
      -- Penalización por contenido sospechoso (5%)
      CASE 
        WHEN (
          SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
          FROM regexp_split_to_table(ccc.content, '') AS char
          WHERE char ~ '[^\w\s]'
        ) > 0.3 THEN -0.05
        ELSE 0
      END
    ) as relevance_score
  FROM course_content_chunks ccc
  WHERE ccc.course_id = course_id_param
    -- Filtros de calidad (ajustados para no excluir contenido válido)
    AND length(ccc.content) >= v_min_content_length
    -- Aumentado a 50% para permitir contenido válido con algo de ruido
    AND (
      SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
      FROM regexp_split_to_table(ccc.content, '') AS char
      WHERE char ~ '[^\w\s]'
    ) < 0.5  -- AUMENTADO: De 40% a 50%
    -- Solo excluir si tiene secuencias repetitivas extremas
    AND NOT (
      -- Solo excluir si tiene secuencias repetitivas de números (más de 6 repeticiones)
      ccc.content ~ '(\d)\1{6,}'
      OR (
        (SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(ccc.content), 1)
         FROM regexp_split_to_table(ccc.content, '') AS char
         WHERE char ~ '\d') > 0.8
        AND ccc.content ~ '(\d)\1{5,}'
      )
    )
    AND (ccc.metadata->>'is_noise' IS NULL OR (ccc.metadata->>'is_noise')::boolean = false)
    -- Búsqueda (más flexible para nombres propios)
    AND (
      -- Primero intentar búsqueda de texto completo estándar
      to_tsvector('spanish', ccc.content) @@ plainto_tsquery('spanish', search_query)
      OR
      -- Fallback 1: buscar palabras clave individuales
      EXISTS (
        SELECT 1 
        FROM unnest(v_query_words) AS word
        WHERE lower(ccc.content) LIKE '%' || word || '%'
      )
      OR
      -- Fallback 2: búsqueda case-insensitive directa (para nombres propios)
      lower(ccc.content) LIKE '%' || lower(search_query) || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$;

-- 3. Función para marcar chunks como ruido (para limpieza manual)
CREATE OR REPLACE FUNCTION mark_chunk_as_noise(
  p_chunk_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE course_content_chunks
  SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_noise": true}'::jsonb
  WHERE id = p_chunk_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para detectar y marcar chunks con ruido automáticamente
-- MEJORADA: Solo marca chunks que son COMPLETAMENTE ruido, no chunks con contenido válido
CREATE OR REPLACE FUNCTION detect_and_mark_noise_chunks(
  p_course_id INTEGER,
  p_min_content_length INTEGER DEFAULT 50
) RETURNS INTEGER AS $$
DECLARE
  v_marked_count INTEGER;
BEGIN
  UPDATE course_content_chunks
  SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_noise": true}'::jsonb
  WHERE course_id = p_course_id
    AND (
      -- Contenido muy corto SIN letras (solo números/caracteres especiales)
      (length(content) < p_min_content_length AND content !~ '[a-zA-Z]')
      -- O secuencias repetitivas extremas (más de 10 repeticiones) SIN contenido válido
      OR (
        content ~ '(\d)\1{10,}'
        AND (
          SELECT COUNT(*)::DOUBLE PRECISION / GREATEST(length(content), 1)
          FROM regexp_split_to_table(content, '') AS char
          WHERE char ~ '[a-zA-Z]'
        ) < 0.1  -- Menos del 10% son letras
      )
      -- O solo caracteres repetidos sin letras
      OR (content ~ '^(\d|\W)\1{10,}$' AND content !~ '[a-zA-Z]')
    )
    AND (metadata->>'is_noise' IS NULL OR (metadata->>'is_noise')::boolean = false);
  
  GET DIAGNOSTICS v_marked_count = ROW_COUNT;
  RETURN v_marked_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Comentarios
COMMENT ON FUNCTION search_course_content_chunks_text_clean IS 'Búsqueda de texto completo con filtrado de ruido y contenido irrelevante';
COMMENT ON FUNCTION search_course_content_chunks_hybrid_clean IS 'Búsqueda híbrida mejorada con filtrado de ruido';
COMMENT ON FUNCTION mark_chunk_as_noise IS 'Marca un chunk como ruido para excluirlo de búsquedas';
COMMENT ON FUNCTION detect_and_mark_noise_chunks IS 'Detecta y marca automáticamente chunks con ruido en un curso';

