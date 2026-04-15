-- 144_fix_to_tsvector_regconfig.sql
-- Corregir error: function to_tsvector(text, text) does not exist
-- El problema es que detected_lang es TEXT pero to_tsvector necesita regconfig
-- Solución: Usar CASE para mapear TEXT a regconfig o hacer cast explícito

-- =====================================================
-- 1. CORREGIR FUNCIÓN search_course_content_chunks_multilang
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
  lang_config regconfig;
BEGIN
  -- Detectar idioma de la consulta
  detected_lang := detect_query_language(search_query);
  
  -- Mapear TEXT a regconfig usando CASE
  lang_config := CASE detected_lang
    WHEN 'spanish' THEN 'spanish'::regconfig
    WHEN 'english' THEN 'english'::regconfig
    WHEN 'portuguese' THEN 'portuguese'::regconfig
    ELSE 'simple'::regconfig  -- Fallback
  END;
  
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
      -- Usar lang_config (regconfig) en lugar de detected_lang (TEXT)
      ts_rank(
        to_tsvector(lang_config, fc.content), 
        plainto_tsquery(lang_config, search_query)
      )::double precision as ts_rank_score,
      -- Búsqueda de substring (independiente del idioma)
      CASE 
        WHEN lower(fc.content) LIKE '%' || lower(search_query) || '%' THEN 1.0::double precision
        ELSE 0.0::double precision
      END as substring_match
    FROM filtered_chunks fc
    WHERE 
      -- Búsqueda con lang_config (regconfig)
      to_tsvector(lang_config, fc.content) @@ plainto_tsquery(lang_config, search_query)
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
        COALESCE(ts_rank(to_tsvector('spanish'::regconfig, fc.content), plainto_tsquery('spanish'::regconfig, search_query))::double precision, 0),
        COALESCE(ts_rank(to_tsvector('english'::regconfig, fc.content), plainto_tsquery('english'::regconfig, search_query))::double precision, 0),
        COALESCE(ts_rank(to_tsvector('portuguese'::regconfig, fc.content), plainto_tsquery('portuguese'::regconfig, search_query))::double precision, 0)
      ) as ts_rank_score,
      CASE 
        WHEN lower(fc.content) LIKE '%' || lower(search_query) || '%' THEN 1.0::double precision
        ELSE 0.0::double precision
      END as substring_match
    FROM filtered_chunks fc
    WHERE 
      -- Buscar en cualquier idioma (usando cast explícito a regconfig)
      to_tsvector('spanish'::regconfig, fc.content) @@ plainto_tsquery('spanish'::regconfig, search_query)
      OR to_tsvector('english'::regconfig, fc.content) @@ plainto_tsquery('english'::regconfig, search_query)
      OR to_tsvector('portuguese'::regconfig, fc.content) @@ plainto_tsquery('portuguese'::regconfig, search_query)
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

-- =====================================================
-- 2. COMENTARIO DE LA FUNCIÓN
-- =====================================================

COMMENT ON FUNCTION search_course_content_chunks_multilang IS 
'Búsqueda multiidioma optimizada - Corregido para usar regconfig en lugar de TEXT';

-- =====================================================
-- 3. VERIFICAR QUE LA FUNCIÓN SE CREÓ CORRECTAMENTE
-- =====================================================

SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'search_course_content_chunks_multilang';

