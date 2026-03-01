-- =====================================================
-- OPTIMIZACIÓN DE FUNCIONES DE BÚSQUEDA RAG
-- Solución al problema de timeout
-- =====================================================

-- PASO 1: Crear índices necesarios para optimizar las búsquedas
-- =====================================================

-- Índice GIN para búsqueda de texto completo en español
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_spanish_fts 
ON course_content_chunks 
USING gin(to_tsvector('spanish', content));

-- Índice para filtrado por curso
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_id 
ON course_content_chunks(course_id);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_course_content 
ON course_content_chunks(course_id, chunk_index);

-- Índice para metadata (si se usa frecuentemente)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_metadata 
ON course_content_chunks USING gin(metadata);

-- Índice para longitud de contenido (usado en filtros)
CREATE INDEX IF NOT EXISTS idx_course_content_chunks_content_length 
ON course_content_chunks((length(content)));

-- PASO 2: Aumentar timeout para estas funciones específicas
-- =====================================================

-- Configurar timeout de 30 segundos para la función de texto
ALTER FUNCTION search_course_content_chunks_text_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION) 
SET statement_timeout = '30s';

-- Configurar timeout de 30 segundos para la función híbrida
ALTER FUNCTION search_course_content_chunks_hybrid_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION) 
SET statement_timeout = '30s';

-- PASO 3: Versión OPTIMIZADA de la función de búsqueda de texto
-- =====================================================

DROP FUNCTION IF EXISTS search_course_content_chunks_text_optimized(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION search_course_content_chunks_text_optimized(
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
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- CTE 1: Pre-filtrar chunks por curso y longitud (muy rápido con índice)
  filtered_chunks AS (
    SELECT 
      ccc.id,
      ccc.content,
      ccc.metadata,
      ccc.chunk_index,
      length(ccc.content) as content_length
    FROM course_content_chunks ccc
    WHERE ccc.course_id = course_id_param
      AND length(ccc.content) >= 30  -- Filtro básico de longitud
      AND (ccc.metadata->>'is_noise' IS NULL OR (ccc.metadata->>'is_noise')::boolean = false)
  ),
  -- CTE 2: Calcular scores de texto completo (usa índice GIN)
  text_search_results AS (
    SELECT 
      fc.id,
      fc.content,
      fc.metadata,
      fc.chunk_index,
      ts_rank(
        to_tsvector('spanish', fc.content), 
        plainto_tsquery('spanish', search_query)
      )::double precision as ts_rank_score,  -- CAST to double precision
      -- Búsqueda simple de substring (más rápido que regex)
      CASE 
        WHEN lower(fc.content) LIKE '%' || lower(search_query) || '%' THEN 1.0::double precision
        ELSE 0.0::double precision
      END as substring_match
    FROM filtered_chunks fc
    WHERE 
      -- Usar índice GIN para búsqueda de texto completo
      to_tsvector('spanish', fc.content) @@ plainto_tsquery('spanish', search_query)
      OR lower(fc.content) LIKE '%' || lower(search_query) || '%'
  )
  -- Selección final con scoring simplificado
  SELECT 
    tsr.id,
    tsr.content,
    tsr.metadata,
    tsr.chunk_index,
    tsr.ts_rank_score as rank,
    -- Score simplificado (mucho más rápido)
    (
      tsr.ts_rank_score * 0.7 +  -- 70% peso a búsqueda de texto completo
      tsr.substring_match * 0.3   -- 30% peso a coincidencia exacta
    ) as relevance_score
  FROM text_search_results tsr
  WHERE 
    -- Solo incluir resultados con score mínimo
    (tsr.ts_rank_score * 0.7 + tsr.substring_match * 0.3) >= min_relevance
  ORDER BY relevance_score DESC, rank DESC
  LIMIT result_limit;
END;
$$;

-- PASO 4: Versión OPTIMIZADA de la función híbrida
-- =====================================================

DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_optimized(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION search_course_content_chunks_hybrid_optimized(
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
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Pre-filtrar chunks (muy rápido con índices)
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
  -- Scoring simplificado
  SELECT 
    fc.id,
    fc.content,
    fc.metadata,
    fc.chunk_index,
    -- Score híbrido simplificado
    (
      -- Texto completo (70%)
      COALESCE(
        ts_rank(
          to_tsvector('spanish', fc.content), 
          plainto_tsquery('spanish', search_query)
        )::double precision,  -- CAST to double precision
        0::double precision
      ) * 0.7 +
      -- Coincidencia de substring (30%)
      CASE 
        WHEN lower(fc.content) LIKE '%' || lower(search_query) || '%' THEN 0.3::double precision
        ELSE 0.0::double precision
      END
    ) as relevance_score
  FROM filtered_chunks fc
  WHERE 
    -- Búsqueda usando índice GIN
    to_tsvector('spanish', fc.content) @@ plainto_tsquery('spanish', search_query)
    OR lower(fc.content) LIKE '%' || lower(search_query) || '%'
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$;

-- PASO 5: Reemplazar funciones antiguas con las optimizadas
-- =====================================================

-- Opción A: Renombrar las antiguas y usar las nuevas
DROP FUNCTION IF EXISTS search_course_content_chunks_text_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS search_course_content_chunks_hybrid_clean(TEXT, INTEGER, INTEGER, DOUBLE PRECISION);

-- Crear alias con el nombre original apuntando a las optimizadas
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
  SELECT * FROM search_course_content_chunks_text_optimized(
    search_query, 
    course_id_param, 
    result_limit, 
    min_relevance
  );
$$;

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
  SELECT * FROM search_course_content_chunks_hybrid_optimized(
    search_query, 
    course_id_param, 
    result_limit, 
    min_relevance
  );
$$;

-- PASO 6: Configurar timeouts para las nuevas funciones
-- =====================================================

ALTER FUNCTION search_course_content_chunks_text_optimized(TEXT, INTEGER, INTEGER, DOUBLE PRECISION) 
SET statement_timeout = '30s';

ALTER FUNCTION search_course_content_chunks_hybrid_optimized(TEXT, INTEGER, INTEGER, DOUBLE PRECISION) 
SET statement_timeout = '30s';

-- PASO 7: Comentarios y documentación
-- =====================================================

COMMENT ON FUNCTION search_course_content_chunks_text_optimized IS 
'Versión OPTIMIZADA de búsqueda de texto completo. Usa CTEs y índices para mejor rendimiento.';

COMMENT ON FUNCTION search_course_content_chunks_hybrid_optimized IS 
'Versión OPTIMIZADA de búsqueda híbrida. Simplifica cálculos para evitar timeouts.';

COMMENT ON FUNCTION search_course_content_chunks_text_clean IS 
'Alias a la función optimizada para compatibilidad con código existente.';

COMMENT ON FUNCTION search_course_content_chunks_hybrid_clean IS 
'Alias a la función optimizada para compatibilidad con código existente.';

-- PASO 8: Análisis de rendimiento (ejecutar después de aplicar cambios)
-- =====================================================

-- NOTA: Las siguientes queries son para análisis manual.
-- Descoméntalas y ejecútalas una por una después de aplicar el script principal.

/*
-- Verificar que los índices se crearon correctamente
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'course_content_chunks'
ORDER BY indexname;

-- Probar la función optimizada
EXPLAIN ANALYZE
SELECT * FROM search_course_content_chunks_text_clean(
  'ejemplos',  -- query de prueba
  1,           -- course_id
  10           -- limit
);

-- Ver estadísticas de la tabla
SELECT 
  schemaname,
  tablename,
  n_live_tup as "Filas vivas",
  n_dead_tup as "Filas muertas",
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'course_content_chunks';
*/

-- PASO 9: Mantenimiento recomendado
-- =====================================================

-- Actualizar estadísticas de la tabla (mejora el query planner)
ANALYZE course_content_chunks;

-- Vacuum si hay muchas filas muertas
-- VACUUM ANALYZE course_content_chunks;

-- =====================================================
-- RESUMEN DE OPTIMIZACIONES APLICADAS
-- =====================================================

/*
1. ÍNDICES CREADOS:
   - idx_course_content_chunks_spanish_fts: GIN para búsqueda de texto completo
   - idx_course_content_chunks_course_id: Para filtrado por curso
   - idx_course_content_chunks_course_content: Índice compuesto
   - idx_course_content_chunks_metadata: Para filtrado de metadata
   - idx_course_content_chunks_content_length: Para filtros de longitud

2. OPTIMIZACIONES DE QUERIES:
   - Uso de CTEs para pre-filtrado eficiente
   - Eliminación de subconsultas complejas en SELECT
   - Scoring simplificado (menos cálculos)
   - Uso de índices GIN para búsqueda de texto completo
   - Eliminación de regex complejos

3. CONFIGURACIÓN:
   - Timeout aumentado a 30 segundos
   - Funciones optimizadas con alias para compatibilidad

4. MEJORAS ESPERADAS:
   - Reducción de tiempo de ejecución: de >10s a <2s
   - Eliminación de timeouts
   - Mejor uso de índices
   - Menor carga en la base de datos

5. PRÓXIMOS PASOS:
   - Ejecutar este script en Supabase
   - Probar las búsquedas en la aplicación
   - Monitorear tiempos de respuesta
   - Ajustar si es necesario
*/
