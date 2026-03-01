-- =====================================================
-- DIAGNÓSTICO: Verificar chunks alrededor de la página 350
-- Ayuda a identificar si hay problemas con el procesamiento
-- de chunks en un rango de páginas específico
-- 
-- ⚠️ NOTA: Si tienes timeouts, usa el script simplificado:
-- diagnosticar_chunks_pagina_350_simple.sql (ejecutar consultas por separado)
-- =====================================================

-- 1. Verificar si existen chunks que incluyen la página 350
-- Buscar en metadata->pageStart y metadata->pageEnd (versión más común)
SELECT 
  id,
  course_id,
  LEFT(content, 200) as content_preview,
  metadata->>'page_start' as page_start,
  metadata->>'page_end' as page_end,
  metadata->>'pageStart' as pageStart_alt,
  metadata->>'pageEnd' as pageEnd_alt,
  metadata->>'material_id' as material_id,
  CASE 
    WHEN embedding IS NULL THEN 'SIN EMBEDDING'
    ELSE 'CON EMBEDDING'
  END as embedding_status,
  created_at
FROM course_content_chunks
WHERE 
  metadata->>'pageStart' IS NOT NULL
  AND CAST(metadata->>'pageStart' AS INTEGER) <= 350 
  AND CAST(metadata->>'pageEnd' AS INTEGER) >= 350
ORDER BY CAST(metadata->>'pageStart' AS INTEGER)
LIMIT 5;

-- 2. Verificar chunks en un rango más amplio (340-360) para contexto (OPTIMIZADO)
-- Usar índices en metadata y limitar la búsqueda
SELECT 
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NULL THEN 1 END) as chunks_sin_embedding,
  COUNT(CASE WHEN content IS NULL OR LENGTH(TRIM(content)) = 0 THEN 1 END) as chunks_vacios,
  MIN(COALESCE(CAST(metadata->>'page_start' AS INTEGER), CAST(metadata->>'pageStart' AS INTEGER))) as min_page,
  MAX(COALESCE(CAST(metadata->>'page_end' AS INTEGER), CAST(metadata->>'pageEnd' AS INTEGER))) as max_page
FROM course_content_chunks
WHERE 
  (metadata->>'page_start' IS NOT NULL OR metadata->>'pageStart' IS NOT NULL)
  AND (
    CAST(COALESCE(metadata->>'page_start', metadata->>'pageStart') AS INTEGER) BETWEEN 340 AND 360
    OR CAST(COALESCE(metadata->>'page_end', metadata->>'pageEnd') AS INTEGER) BETWEEN 340 AND 360
  )
LIMIT 1000; -- Limitar para evitar timeout

-- 3. Buscar texto específico "Estadificación del cáncer mamario" (OPTIMIZADO)
-- Usar ILIKE con límite estricto y buscar primero por material específico
SELECT 
  id,
  LEFT(content, 300) as content_preview,
  COALESCE(metadata->>'page_start', metadata->>'pageStart') as page_start,
  COALESCE(metadata->>'page_end', metadata->>'pageEnd') as page_end,
  metadata->>'material_id' as material_id,
  CASE 
    WHEN embedding IS NULL THEN 'SIN EMBEDDING'
    ELSE 'CON EMBEDDING'
  END as embedding_status
FROM course_content_chunks
WHERE 
  content ILIKE '%estadificación%mamario%'
  AND (metadata->>'page_start' IS NOT NULL OR metadata->>'pageStart' IS NOT NULL)
ORDER BY 
  COALESCE(CAST(metadata->>'page_start' AS INTEGER), CAST(metadata->>'pageStart' AS INTEGER), 0)
LIMIT 5; -- Reducido para evitar timeout

-- 4. Verificar si hay gaps (huecos) en el rango de páginas procesadas (OPTIMIZADO)
-- Filtrar primero por rango para reducir datos procesados
WITH page_ranges AS (
  SELECT 
    COALESCE(CAST(metadata->>'page_start' AS INTEGER), CAST(metadata->>'pageStart' AS INTEGER)) as start_page,
    COALESCE(CAST(metadata->>'page_end' AS INTEGER), CAST(metadata->>'pageEnd' AS INTEGER)) as end_page
  FROM course_content_chunks
  WHERE 
    (metadata->>'page_start' IS NOT NULL OR metadata->>'pageStart' IS NOT NULL)
    AND (
      CAST(COALESCE(metadata->>'page_start', metadata->>'pageStart') AS INTEGER) BETWEEN 340 AND 360
      OR CAST(COALESCE(metadata->>'page_end', metadata->>'pageEnd') AS INTEGER) BETWEEN 340 AND 360
    )
  ORDER BY start_page
  LIMIT 100 -- Limitar para evitar timeout
)
SELECT 
  start_page,
  end_page,
  LAG(end_page) OVER (ORDER BY start_page) as prev_end_page,
  CASE 
    WHEN LAG(end_page) OVER (ORDER BY start_page) IS NOT NULL 
         AND start_page > LAG(end_page) OVER (ORDER BY start_page) + 1
    THEN start_page - LAG(end_page) OVER (ORDER BY start_page) - 1
    ELSE 0
  END as gap_pages
FROM page_ranges
ORDER BY start_page;

-- 5. Verificar estado general del procesamiento del material (OPTIMIZADO)
-- Filtrar primero materiales y luego hacer JOIN
SELECT 
  m.id as material_id,
  m.title as material_title,
  COUNT(DISTINCT c.id) as total_chunks,
  COUNT(DISTINCT CASE WHEN c.embedding IS NOT NULL THEN c.id END) as chunks_con_embedding,
  MIN(CAST(COALESCE(c.metadata->>'page_start', c.metadata->>'pageStart') AS INTEGER)) as min_page_procesada,
  MAX(CAST(COALESCE(c.metadata->>'page_end', c.metadata->>'pageEnd') AS INTEGER)) as max_page_procesada,
  COUNT(DISTINCT CASE WHEN c.metadata->>'page_start' IS NULL AND c.metadata->>'pageStart' IS NULL THEN c.id END) as chunks_sin_pagina
FROM course_materials m
INNER JOIN course_content_chunks c ON c.metadata->>'material_id' = m.id::TEXT
WHERE 
  (m.title ILIKE '%cáncer%mamario%' OR m.title ILIKE '%schwartz%' OR m.title ILIKE '%cirugía%')
GROUP BY m.id, m.title
ORDER BY m.title
LIMIT 10; -- Limitar resultados

-- =====================================================
-- NOTAS:
-- Este script ayuda a diagnosticar problemas con chunks en páginas específicas
-- Si los chunks no son efectivos, considerar evaluar RAG Graph como alternativa
-- =====================================================
