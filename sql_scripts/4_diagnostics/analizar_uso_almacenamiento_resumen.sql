-- Script RESUMEN - Análisis rápido de almacenamiento y costos
-- Ejecutar en Supabase SQL Editor para ver resultados principales

-- =====================================================
-- RESUMEN EJECUTIVO (Ejecutar primero)
-- =====================================================

-- 1. Tamaño total de almacenamiento
SELECT 
  '📊 ALMACENAMIENTO TOTAL' as métrica,
  pg_size_pretty(pg_total_relation_size('course_content_chunks')) as valor,
  'Tamaño total de la tabla (datos + índices)' as descripción;

-- 2. Cantidad de datos
SELECT 
  '📦 TOTAL DE CHUNKS' as métrica,
  COUNT(*)::text as valor,
  'Cantidad total de chunks almacenados' as descripción
FROM course_content_chunks

UNION ALL

SELECT 
  '📚 CURSOS CON CONTENIDO' as métrica,
  COUNT(DISTINCT course_id)::text as valor,
  'Cantidad de cursos con chunks' as descripción
FROM course_content_chunks

UNION ALL

SELECT 
  '📄 MATERIALES PROCESADOS' as métrica,
  COUNT(DISTINCT (metadata->>'material_id'))::text as valor,
  'Cantidad de materiales únicos' as descripción
FROM course_content_chunks
WHERE metadata->>'material_id' IS NOT NULL AND metadata->>'material_id' != 'null';

-- 3. Desglose de tamaño
SELECT 
  '💾 Tamaño de datos' as componente,
  pg_size_pretty(pg_relation_size('course_content_chunks')) as tamaño,
  ROUND(pg_relation_size('course_content_chunks') * 100.0 / NULLIF(pg_total_relation_size('course_content_chunks'), 0), 1) as porcentaje
UNION ALL
SELECT 
  '🔍 Tamaño de índices' as componente,
  pg_size_pretty(pg_indexes_size('course_content_chunks')) as tamaño,
  ROUND(pg_indexes_size('course_content_chunks') * 100.0 / NULLIF(pg_total_relation_size('course_content_chunks'), 0), 1) as porcentaje;

-- 4. Costos totales procesados (con manejo de casos sin datos)
SELECT 
  '💰 COSTOS TOTALES' as métrica,
  COALESCE('$' || ROUND(SUM((actual_costs->>'total')::numeric), 2)::text, 'Sin datos aún') as valor,
  'Costo total acumulado de procesamiento' as descripción
FROM processing_costs
WHERE actual_costs IS NOT NULL
HAVING COUNT(*) > 0

UNION ALL

SELECT 
  '📋 JOBS PROCESADOS' as métrica,
  COALESCE(COUNT(*)::text, '0') as valor,
  'Cantidad de trabajos completados' as descripción
FROM processing_costs
WHERE actual_costs IS NOT NULL

UNION ALL

SELECT 
  '📄 PÁGINAS PROCESADAS' as métrica,
  COALESCE(SUM(total_pages)::text, '0') as valor,
  'Total de páginas procesadas' as descripción
FROM processing_costs
WHERE actual_costs IS NOT NULL;

-- 5. Promedio de chunks por página (para verificar optimización)
SELECT 
  '📊 PÁGINAS POR CHUNK (PROMEDIO)' as métrica,
  COALESCE(ROUND(AVG(total_pages::numeric / NULLIF(total_chunks, 0)), 1)::text, 'Sin datos') as valor,
  'Promedio actual - objetivo: 60 páginas/chunk' as descripción
FROM processing_costs
WHERE total_chunks > 0 AND total_pages > 0
HAVING COUNT(*) > 0;

-- 6. Proyección de ahorro con optimización
WITH stats AS (
  SELECT 
    COALESCE(SUM(total_chunks), 0) as total_chunks_actual,
    COALESCE(SUM(total_pages), 0) as total_paginas
  FROM processing_costs
  WHERE total_chunks > 0 AND total_pages > 0
),
current_chunks AS (
  SELECT COUNT(*) as chunks_actuales FROM course_content_chunks
)
SELECT 
  '🎯 PROYECCIÓN DE OPTIMIZACIÓN' as métrica,
  CASE 
    WHEN stats.total_chunks_actual > 0 THEN
      ROUND((stats.total_chunks_actual - CEIL(stats.total_paginas / 60.0)) * 100.0 / stats.total_chunks_actual, 1)::text || '% reducción'
    WHEN current_chunks.chunks_actuales > 0 THEN
      'Sistema en fase inicial - optimizaciones aplicadas para futuro'
    ELSE 'Sin datos'
  END as valor,
  'Reducción estimada con chunks de 60 páginas' as descripción
FROM stats, current_chunks;

-- 7. Oportunidades de limpieza
SELECT 
  '🧹 CHUNKS PEQUEÑOS (<500 chars)' as métrica,
  COUNT(*)::text as valor,
  'Chunks que podrían consolidarse' as descripción
FROM course_content_chunks
WHERE LENGTH(content) < 500

UNION ALL

SELECT 
  '🔗 CHUNKS HUÉRFANOS' as métrica,
  COUNT(*)::text as valor,
  'Chunks sin material_id asociado' as descripción
FROM course_content_chunks
WHERE metadata->>'material_id' IS NULL OR metadata->>'material_id' = 'null';

