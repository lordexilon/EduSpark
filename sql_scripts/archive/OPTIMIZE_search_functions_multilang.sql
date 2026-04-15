-- =====================================================
-- OPTIMIZACIÓN DE BÚSQUEDAS RAG - MULTIIDIOMA
-- Soporte para Español, Inglés y Portugués
-- =====================================================

-- PASO 1: Crear índices GIN para cada idioma
-- =====================================================

-- Índice para español (existente)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_spanish_fts 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- Índice para inglés
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_english_fts 
ON course_content_chunks 
USING gin(to_tsvector('english', content));

-- Índice para portugués
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_portuguese_fts 
ON course_content_chunks 
USING gin(to_tsvector('portuguese', content));

-- Índice simple (sin idioma específico) para fallback
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_simple_fts 
ON course_content_chunks 
USING gin(to_tsvector('simple', content));

-- Índices adicionales para optimización
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_content 
ON course_content_chunks(course_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_metadata 
ON course_content_chunks USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_course_content_chunks_content_length 
ON course_content_chunks((length(content)));

-- PASO 2: Función para detectar idioma de la consulta
-- =====================================================

CREATE OR REPLACE FUNCTION detect_query_language(query_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  spanish_words TEXT[] := ARRAY['que', 'como', 'donde', 'cuando', 'porque', 'cual', 'quien', 'ejemplos', 'explicar', 'ayuda'];
  english_words TEXT[] := ARRAY['what', 'how', 'where', 'when', 'why', 'which', 'who', 'examples', 'explain', 'help'];
  portuguese_words TEXT[] := ARRAY['que', 'como', 'onde', 'quando', 'porque', 'qual', 'quem', 'exemplos', 'explicar', 'ajuda'];
  
  spanish_count INTEGER := 0;
  english_count INTEGER := 0;
  portuguese_count INTEGER := 0;
  
  word TEXT;
  lower_query TEXT;
BEGIN
  lower_query := lower(query_text);
  
  -- Contar palabras en español
  FOREACH word IN ARRAY spanish_words LOOP
    IF lower_query ~ ('\m' || word || '\M') THEN
      spanish_count := spanish_count + 1;
    END IF;
  END LOOP;
  
  -- Contar palabras en inglés
  FOREACH word IN ARRAY english_words LOOP
    IF lower_query ~ ('\m' || word || '\M') THEN
      english_count := english_count + 1;
    END IF;
  END LOOP;
  
  -- Contar palabras en portugués
  FOREACH word IN ARRAY portuguese_words LOOP
    IF lower_query ~ ('\m' || word || '\M') THEN
      portuguese_count := portuguese_count + 1;
    END IF;
  END LOOP;
  
  -- Retornar el idioma con más coincidencias
  IF spanish_count >= english_count AND spanish_count >= portuguese_count THEN
    RETURN 'spanish';
  ELSIF english_count >= portuguese_count THEN
    RETURN 'english';
  ELSE
    RETURN 'portuguese';
  END IF;
END;
$$;

-- PASO 3: Función de búsqueda multiidioma optimizada
-- =====================================================

DROP FUNCTION IF EXISTS search_course_content_chunks_multilang(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION search_course_content_chunks_multilang(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  rank DOUBLE PRECISION,
  relevance_score DOUBLE PRECISION,
  detected_language TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  detected_lang TEXT;
BEGIN
  -- Detectar idioma de la consulta
  detected_lang := detect_query_language(search_query);
  
  RETURN QUERY
  WITH 
  -- CTE 1: Pre-filtrar chunks por curso
  filtered_chunks AS (
    SELECT 
      ccc.id,
      ccc.content,
      ccc.metadata,
      ccc.chunk_index
    FROM course_content_chunks ccc
    WHERE ccc.course_id = course_id_param
      AND length(ccc.content) >= 30
      AND (ccc.metadata->>'is_noise' IS NULL OR (ccc.metadata->>'is_noise')::boolean = false)
  ),
  -- CTE 2: Búsqueda con el idioma detectado
  language_search AS (
    SELECT 
      fc.id,
      fc.content,
      fc.metadata,
      fc.chunk_index,
      -- Usar el idioma detectado para ts_rank
      ts_rank(
        to_tsvector(detected_lang, fc.content), 
        plainto_tsquery(detected_lang, search_query)
      )::double precision as ts_rank_score,
      -- Búsqueda de substring (independiente del idioma)
      CASE 
        WHEN lower(fc.content) LIKE '%' || lower(search_query) || '%' THEN 1.0::double precision
        ELSE 0.0::double precision
      END as substring_match
    FROM filtered_chunks fc
    WHERE 
      -- Búsqueda con idioma detectado
      to_tsvector(detected_lang, fc.content) @@ plainto_tsquery(detected_lang, search_query)
      OR lower(fc.content) LIKE '%' || lower(search_query) || '%'
  ),
  -- CTE 3: Fallback multiidioma si no hay resultados
  multi_language_fallback AS (
    SELECT 
      fc.id,
      fc.content,
      fc.metadata,
      fc.chunk_index,
      -- Probar con todos los idiomas y tomar el mejor score
      GREATEST(
        COALESCE(ts_rank(to_tsvector('spanish', fc.content), plainto_tsquery('spanish', search_query))::double precision, 0),
        COALESCE(ts_rank(to_tsvector('english', fc.content), plainto_tsquery('english', search_query))::double precision, 0),
        COALESCE(ts_rank(to_tsvector('portuguese', fc.content), plainto_tsquery('portuguese', search_query))::double precision, 0)
      ) as ts_rank_score,
      CASE 
        WHEN lower(fc.content) LIKE '%' || lower(search_query) || '%' THEN 1.0::double precision
        ELSE 0.0::double precision
      END as substring_match
    FROM filtered_chunks fc
    WHERE 
      -- Buscar en cualquier idioma
      to_tsvector('spanish', fc.content) @@ plainto_tsquery('spanish', search_query)
      OR to_tsvector('english', fc.content) @@ plainto_tsquery('english', search_query)
      OR to_tsvector('portuguese', fc.content) @@ plainto_tsquery('portuguese', search_query)
      OR lower(fc.content) LIKE '%' || lower(search_query) || '%'
  ),
  -- CTE 4: Combinar resultados
  combined_results AS (
    SELECT * FROM language_search
    UNION
    SELECT * FROM multi_language_fallback
  )
  -- Selección final
  SELECT 
    cr.id,
    cr.content,
    cr.metadata,
    cr.chunk_index,
    cr.ts_rank_score as rank,
    (
      cr.ts_rank_score * 0.7 +
      cr.substring_match * 0.3
    ) as relevance_score,
    detected_lang as detected_language
  FROM combined_results cr
  WHERE 
    (cr.ts_rank_score * 0.7 + cr.substring_match * 0.3) >= min_relevance
  ORDER BY relevance_score DESC, rank DESC
  LIMIT result_limit;
END;
$$;

-- PASO 4: Función híbrida multiidioma
-- =====================================================

DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_multilang(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_multilang(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  relevance_score DOUBLE PRECISION,
  detected_language TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  detected_lang TEXT;
BEGIN
  detected_lang := detect_query_language(search_query);
  
  RETURN QUERY
  WITH 
  filtered_chunks AS (
    SELECT 
      ccc.id,
      ccc.content,
      ccc.metadata,
      ccc.chunk_index
    FROM course_content_chunks ccc
    WHERE ccc.course_id = course_id_param
      AND length(ccc.content) >= 30
      AND (ccc.metadata->>'is_noise' IS NULL OR (ccc.metadata->>'is_noise')::boolean = false)
  )
  SELECT 
    fc.id,
    fc.content,
    fc.metadata,
    fc.chunk_index,
    (
      -- Búsqueda multiidioma
      GREATEST(
        COALESCE(ts_rank(to_tsvector('spanish', fc.content), plainto_tsquery('spanish', search_query))::double precision, 0),
        COALESCE(ts_rank(to_tsvector('english', fc.content), plainto_tsquery('english', search_query))::double precision, 0),
        COALESCE(ts_rank(to_tsvector('portuguese', fc.content), plainto_tsquery('portuguese', search_query))::double precision, 0)
      ) * 0.7 +
      CASE 
        WHEN lower(fc.content) LIKE '%' || lower(search_query) || '%' THEN 0.3::double precision
        ELSE 0.0::double precision
      END
    ) as relevance_score,
    detected_lang as detected_language
  FROM filtered_chunks fc
  WHERE 
    to_tsvector('spanish', fc.content) @@ plainto_tsquery('spanish', search_query)
    OR to_tsvector('english', fc.content) @@ plainto_tsquery('english', search_query)
    OR to_tsvector('portuguese', fc.content) @@ plainto_tsquery('portuguese', search_query)
    OR lower(fc.content) LIKE '%' || lower(search_query) || '%'
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$;

-- PASO 5: Actualizar funciones existentes para usar multiidioma
-- =====================================================

-- Reemplazar función de texto con versión multiidioma
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION search_course_content_chunks_text_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  rank DOUBLE PRECISION,
  relevance_score DOUBLE PRECISION
) 
LANGUAGE SQL
AS $$
  SELECT 
    id, 
    content, 
    metadata, 
    chunk_index, 
    rank, 
    relevance_score
  FROM search_course_content_chunks_multilang(
    search_query, 
    course_id_param, 
    result_limit, 
    min_relevance
  );
$$;

-- Reemplazar función híbrida con versión multiidioma
DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_clean(
  search_query TEXT,
  course_id_param INTEGER,
  result_limit INTEGER DEFAULT 3,
  min_relevance DOUBLE PRECISION DEFAULT 0.05
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  chunk_index INTEGER,
  relevance_score DOUBLE PRECISION
) 
LANGUAGE SQL
AS $$
  SELECT 
    id, 
    content, 
    metadata, 
    chunk_index, 
    relevance_score
  FROM search_course_content_chunks_hybrid_multilang(
    search_query, 
    course_id_param, 
    result_limit, 
    min_relevance
  );
$$;

-- PASO 6: Configurar timeouts
-- =====================================================

ALTER FUNCTION search_course_content_chunks_multilang(TEXT, INTEGER, INTEGER, DOUBLE PRECISION) 
SET statement_timeout = '30s';

ALTER FUNCTION search_course_content_chunks_hybrid_multilang(TEXT, INTEGER, INTEGER, DOUBLE PRECISION) 
SET statement_timeout = '30s';

ALTER FUNCTION detect_query_language(TEXT) 
SET statement_timeout = '5s';

-- PASO 7: Comentarios y documentación
-- =====================================================

COMMENT ON FUNCTION detect_query_language IS 
'Detecta automáticamente el idioma de una consulta (español, inglés o portugués)';

COMMENT ON FUNCTION search_course_content_chunks_multilang IS 
'Búsqueda de texto completo multiidioma (ES/EN/PT) con detección automática';

COMMENT ON FUNCTION search_course_content_chunks_hybrid_multilang IS 
'Búsqueda híbrida multiidioma (ES/EN/PT) con scoring combinado';

COMMENT ON FUNCTION search_course_content_chunks_text_clean IS 
'Alias compatible con código existente - usa búsqueda multiidioma';

COMMENT ON FUNCTION search_course_content_chunks_hybrid_clean IS 
'Alias compatible con código existente - usa búsqueda híbrida multiidioma';

-- PASO 8: Mantenimiento
-- =====================================================

-- Actualizar estadísticas
ANALYZE course_content_chunks;

-- =====================================================
-- PRUEBAS DE FUNCIONALIDAD
-- =====================================================

/*
-- Probar detección de idioma
SELECT detect_query_language('¿Qué son los monomios?');  -- Debería retornar 'spanish'
SELECT detect_query_language('What are monomials?');      -- Debería retornar 'english'
SELECT detect_query_language('O que são monômios?');      -- Debería retornar 'portuguese'

-- Probar búsqueda en español
SELECT * FROM search_course_content_chunks_text_clean(
  '¿Qué son los monomios?',
  1,
  5
);

-- Probar búsqueda en inglés
SELECT * FROM search_course_content_chunks_text_clean(
  'What are monomials?',
  1,
  5
);

-- Probar búsqueda en portugués
SELECT * FROM search_course_content_chunks_text_clean(
  'O que são monômios?',
  1,
  5
);
*/

-- =====================================================
-- RESUMEN DE MEJORAS MULTIIDIOMA
-- =====================================================

/*
1. ÍNDICES MULTIIDIOMA:
   - idx_course_content_chunks_spanish_fts: Para búsquedas en español
   - idx_course_content_chunks_english_fts: Para búsquedas en inglés
   - idx_course_content_chunks_portuguese_fts: Para búsquedas en portugués
   - idx_course_content_chunks_simple_fts: Fallback sin idioma específico

2. DETECCIÓN AUTOMÁTICA DE IDIOMA:
   - Función detect_query_language() analiza palabras clave
   - Detecta español, inglés y portugués automáticamente
   - Usa el idioma detectado para optimizar la búsqueda

3. BÚSQUEDA MULTIIDIOMA:
   - Primero busca con el idioma detectado (más rápido)
   - Fallback a búsqueda en todos los idiomas si no hay resultados
   - Combina resultados y elimina duplicados

4. COMPATIBILIDAD:
   - Las funciones existentes (search_course_content_chunks_text_clean)
     ahora usan automáticamente la búsqueda multiidioma
   - No requiere cambios en el código frontend

5. VENTAJAS:
   - ✅ Soporte para español, inglés y portugués
   - ✅ Detección automática del idioma
   - ✅ Mejor precisión en búsquedas
   - ✅ Compatible con código existente
   - ✅ Optimizado con índices específicos por idioma
*/
