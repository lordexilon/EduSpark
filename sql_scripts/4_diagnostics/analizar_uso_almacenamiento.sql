-- Script para analizar el uso de almacenamiento y optimizar costos
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- 1. ANÁLISIS DE ALMACENAMIENTO DE CHUNKS
-- =====================================================

-- Tamaño total de la tabla course_content_chunks
SELECT 
  pg_size_pretty(pg_total_relation_size('course_content_chunks')) as tamaño_total_tabla,
  pg_size_pretty(pg_relation_size('course_content_chunks')) as tamaño_datos,
  pg_size_pretty(pg_indexes_size('course_content_chunks')) as tamaño_indices;

-- Cantidad de chunks y estadísticas
SELECT 
  COUNT(*) as total_chunks,
  COUNT(DISTINCT course_id) as total_cursos,
  COUNT(DISTINCT (metadata->>'material_id')) as total_materiales,
  AVG(LENGTH(content)) as promedio_caracteres_por_chunk,
  AVG(LENGTH(content::text)) / 1024.0 as promedio_kb_por_chunk,
  SUM(LENGTH(content::text)) / 1024.0 / 1024.0 as total_mb_contenido
FROM course_content_chunks;

-- Distribución de chunks por curso
SELECT 
  course_id,
  COUNT(*) as cantidad_chunks,
  AVG(LENGTH(content)) as promedio_caracteres,
  SUM(LENGTH(content::text)) / 1024.0 / 1024.0 as total_mb
FROM course_content_chunks
GROUP BY course_id
ORDER BY cantidad_chunks DESC
LIMIT 20;

-- Análisis de metadatos (tamaño JSONB)
SELECT 
  AVG(pg_column_size(metadata)) as promedio_bytes_metadata,
  MAX(pg_column_size(metadata)) as max_bytes_metadata,
  MIN(pg_column_size(metadata)) as min_bytes_metadata,
  SUM(pg_column_size(metadata)) / 1024.0 / 1024.0 as total_mb_metadata
FROM course_content_chunks;

-- Tamaño estimado de embeddings (768 dimensiones × 4 bytes = 3072 bytes)
SELECT 
  COUNT(*) as total_chunks,
  COUNT(*) * 3072 / 1024.0 / 1024.0 as total_mb_embeddings_estimado
FROM course_content_chunks
WHERE embedding IS NOT NULL;

-- =====================================================
-- 2. ANÁLISIS DE COSTOS DE PROCESAMIENTO
-- =====================================================

-- Resumen de costos por job
SELECT 
  COUNT(*) as total_jobs,
  SUM((actual_costs->>'total')::numeric) as costo_total_usd,
  AVG((actual_costs->>'total')::numeric) as costo_promedio_por_job,
  SUM(total_pages) as total_paginas_procesadas,
  SUM(total_chunks) as total_chunks_procesados,
  AVG(total_chunks::numeric / NULLIF(total_pages, 0)) as promedio_chunks_por_pagina
FROM processing_costs
WHERE actual_costs IS NOT NULL;

-- Costos por tipo de PDF
SELECT 
  pdf_type,
  COUNT(*) as cantidad_jobs,
  SUM((actual_costs->>'total')::numeric) as costo_total,
  AVG((actual_costs->>'total')::numeric) as costo_promedio,
  SUM(total_pages) as total_paginas
FROM processing_costs
WHERE actual_costs IS NOT NULL
GROUP BY pdf_type;

-- Costos por usuario (top 10)
SELECT 
  user_id,
  COUNT(*) as cantidad_jobs,
  SUM((actual_costs->>'total')::numeric) as costo_total,
  AVG((actual_costs->>'total')::numeric) as costo_promedio
FROM processing_costs
WHERE actual_costs IS NOT NULL AND user_id IS NOT NULL
GROUP BY user_id
ORDER BY costo_total DESC
LIMIT 10;

-- =====================================================
-- 3. IDENTIFICAR OPORTUNIDADES DE OPTIMIZACIÓN
-- =====================================================

-- Chunks con metadatos muy grandes (posible optimización)
SELECT 
  id,
  course_id,
  chunk_index,
  pg_column_size(metadata) as tamaño_metadata_bytes,
  LENGTH(content) as tamaño_contenido_caracteres
FROM course_content_chunks
WHERE pg_column_size(metadata) > 5000 -- Metadatos mayores a 5KB
ORDER BY pg_column_size(metadata) DESC
LIMIT 20;

-- Chunks duplicados potenciales (mismo contenido, mismo curso)
SELECT 
  course_id,
  content,
  COUNT(*) as cantidad_duplicados
FROM course_content_chunks
GROUP BY course_id, content
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC
LIMIT 20;

-- Chunks huérfanos (sin material asociado o material eliminado)
SELECT 
  COUNT(*) as chunks_sin_material_id,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM course_content_chunks) as porcentaje
FROM course_content_chunks
WHERE metadata->>'material_id' IS NULL OR metadata->>'material_id' = 'null';

-- Chunks con contenido muy pequeño (posible consolidación)
SELECT 
  COUNT(*) as chunks_pequeños,
  AVG(LENGTH(content)) as promedio_caracteres
FROM course_content_chunks
WHERE LENGTH(content) < 500; -- Menos de 500 caracteres

-- =====================================================
-- 4. PROYECCIÓN DE COSTOS CON OPTIMIZACIONES
-- =====================================================

-- Calcular reducción potencial si aumentamos chunks de 25 a 60 páginas
-- (Esto es una estimación basada en el promedio actual)
WITH stats AS (
  SELECT 
    AVG(total_pages::numeric / NULLIF(total_chunks, 0)) as paginas_por_chunk_actual,
    SUM(total_chunks) as total_chunks_actual,
    SUM(total_pages) as total_paginas
  FROM processing_costs
  WHERE total_chunks > 0 AND total_pages > 0
)
SELECT 
  total_paginas,
  total_chunks_actual as chunks_actuales,
  CEIL(total_paginas / 60.0) as chunks_optimizados_60_paginas,
  total_chunks_actual - CEIL(total_paginas / 60.0) as reduccion_chunks,
  ROUND((total_chunks_actual - CEIL(total_paginas / 60.0)) * 100.0 / total_chunks_actual, 2) as porcentaje_reduccion
FROM stats;

-- =====================================================
-- 5. RESUMEN EJECUTIVO
-- =====================================================

SELECT 
  'RESUMEN DE ALMACENAMIENTO' as seccion,
  pg_size_pretty(pg_total_relation_size('course_content_chunks')) as tamaño_total,
  (SELECT COUNT(*) FROM course_content_chunks) as total_chunks,
  (SELECT COUNT(DISTINCT course_id) FROM course_content_chunks) as total_cursos,
  (SELECT ROUND(AVG(LENGTH(content)) / 1024.0, 2) FROM course_content_chunks) as promedio_kb_por_chunk
UNION ALL
SELECT 
  'COSTOS TOTALES' as seccion,
  '$' || ROUND(SUM((actual_costs->>'total')::numeric), 2)::text as valor,
  NULL::bigint,
  NULL::bigint,
  NULL::numeric
FROM processing_costs
WHERE actual_costs IS NOT NULL
UNION ALL
SELECT 
  'OPORTUNIDADES' as seccion,
  (SELECT COUNT(*)::text FROM course_content_chunks WHERE LENGTH(content) < 500) as chunks_pequeños,
  (SELECT COUNT(*) FROM course_content_chunks WHERE metadata->>'material_id' IS NULL) as chunks_huérfanos,
  NULL::bigint,
  NULL::numeric;

