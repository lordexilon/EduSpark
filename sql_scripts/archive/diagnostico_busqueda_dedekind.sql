-- =====================================================
-- DIAGNÓSTICO COMPLETO: Por qué no encuentra "Richard Dedekind"
-- =====================================================

-- PASO 1: Verificar que los chunks existen
SELECT 
  'PASO 1: Chunks que contienen "dedekind"' as paso,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT course_id) as cursos_diferentes
FROM course_content_chunks
WHERE content ILIKE '%dedekind%';

-- PASO 2: Ver detalles de los chunks encontrados
SELECT 
  'PASO 2: Detalles de chunks con Dedekind' as paso,
  id,
  course_id,
  LEFT(content, 300) as content_preview,
  LENGTH(content) as content_length,
  chunk_index,
  metadata->>'material_id' as material_id,
  metadata->>'sourceFileName' as source_file
FROM course_content_chunks
WHERE content ILIKE '%dedekind%'
ORDER BY course_id, chunk_index
LIMIT 10;

-- PASO 3: Verificar si los chunks pasan los filtros de búsqueda
SELECT 
  'PASO 3: Análisis de filtros' as paso,
  id,
  course_id,
  LENGTH(content) as length,
  CASE 
    WHEN LENGTH(content) < 30 THEN '❌ Muy corto (< 30 chars)'
    ELSE '✅ Longitud OK'
  END as filtro_longitud,
  CASE 
    WHEN (
      SELECT COUNT(*)::REAL / GREATEST(length(content), 1)
      FROM regexp_split_to_table(content, '') AS char
      WHERE char ~ '[^\w\s]'
    ) > 0.5 THEN '❌ Demasiados caracteres especiales (> 50%)'
    ELSE '✅ Caracteres especiales OK'
  END as filtro_caracteres_especiales,
  CASE 
    WHEN content ~ '(\d)\1{6,}' THEN '❌ Secuencias repetitivas extremas'
    WHEN (
      (SELECT COUNT(*)::REAL / GREATEST(length(content), 1)
       FROM regexp_split_to_table(content, '') AS char
       WHERE char ~ '\d') > 0.8
      AND content ~ '(\d)\1{5,}'
    ) THEN '❌ Demasiados números repetitivos'
    ELSE '✅ Números OK'
  END as filtro_numeros,
  CASE 
    WHEN metadata->>'is_noise' = 'true' THEN '❌ Marcado como ruido'
    ELSE '✅ No marcado como ruido'
  END as filtro_metadata
FROM course_content_chunks
WHERE content ILIKE '%dedekind%'
ORDER BY course_id, chunk_index;

-- PASO 4: Probar búsqueda de texto completo directa
SELECT 
  'PASO 4: Búsqueda texto completo directa' as paso,
  id,
  course_id,
  LEFT(content, 200) as content_preview,
  ts_rank(
    to_tsvector('spanish', content), 
    plainto_tsquery('spanish', 'Dedekind')
  ) as rank,
  CASE 
    WHEN to_tsvector('spanish', content) @@ plainto_tsquery('spanish', 'Dedekind') 
    THEN '✅ Encontrado'
    ELSE '❌ No encontrado'
  END as encontrado
FROM course_content_chunks
WHERE course_id IN (
  SELECT DISTINCT course_id 
  FROM course_content_chunks 
  WHERE content ILIKE '%dedekind%'
)
ORDER BY rank DESC NULLS LAST
LIMIT 10;

-- PASO 5: Probar búsqueda case-insensitive directa
SELECT 
  'PASO 5: Búsqueda case-insensitive' as paso,
  id,
  course_id,
  LEFT(content, 200) as content_preview,
  CASE 
    WHEN lower(content) LIKE '%dedekind%' THEN '✅ Encontrado'
    ELSE '❌ No encontrado'
  END as encontrado
FROM course_content_chunks
WHERE course_id IN (
  SELECT DISTINCT course_id 
  FROM course_content_chunks 
  WHERE content ILIKE '%dedekind%'
)
AND lower(content) LIKE '%dedekind%'
LIMIT 10;

-- PASO 6: Probar función de búsqueda mejorada (con diferentes course_id)
-- IMPORTANTE: Cambiar el course_id por el correcto
SELECT 
  'PASO 6: Función search_course_content_chunks_text_clean' as paso,
  *
FROM search_course_content_chunks_text_clean(
  'Dedekind',
  (SELECT DISTINCT course_id FROM course_content_chunks WHERE content ILIKE '%dedekind%' LIMIT 1),  -- Usa el primer course_id que tenga Dedekind
  10,  -- result_limit
  0.01  -- min_relevance (muy bajo)
);

-- PASO 7: Verificar si el problema es el course_id
SELECT 
  'PASO 7: Verificar course_id' as paso,
  course_id,
  COUNT(*) as chunks_con_dedekind,
  MIN(chunk_index) as primer_chunk,
  MAX(chunk_index) as ultimo_chunk
FROM course_content_chunks
WHERE content ILIKE '%dedekind%'
GROUP BY course_id;

-- PASO 8: Probar búsqueda con diferentes variantes del nombre
SELECT 
  'PASO 8: Variantes del nombre' as paso,
  'Richard Dedekind' as busqueda,
  COUNT(*) as encontrados
FROM course_content_chunks
WHERE content ILIKE '%richard%dedekind%' OR content ILIKE '%dedekind%'
UNION ALL
SELECT 
  'PASO 8: Variantes del nombre' as paso,
  'Dedekind' as busqueda,
  COUNT(*) as encontrados
FROM course_content_chunks
WHERE content ILIKE '%dedekind%'
UNION ALL
SELECT 
  'PASO 8: Variantes del nombre' as paso,
  'DEDEKIND' as busqueda,
  COUNT(*) as encontrados
FROM course_content_chunks
WHERE content ILIKE '%DEDEKIND%';

-- PASO 9: Ver contenido completo de un chunk de ejemplo
SELECT 
  'PASO 9: Contenido completo de ejemplo' as paso,
  id,
  course_id,
  content,  -- Contenido completo
  LENGTH(content) as length,
  chunk_index
FROM course_content_chunks
WHERE content ILIKE '%dedekind%'
ORDER BY LENGTH(content) DESC
LIMIT 1;


