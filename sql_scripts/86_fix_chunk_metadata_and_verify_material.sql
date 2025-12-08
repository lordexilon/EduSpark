-- =====================================================
-- Script: Verificar y corregir metadata de chunks
-- Descripción: Verifica el material específico y corrige metadata si es necesario
-- Fecha: 2025-12-01
-- =====================================================

-- 1. Verificar el material con ID 82db3bb8-307c-4193-b723-cc69e337568e
SELECT 
  m.id,
  m.title,
  m.kind,
  m.course_id,
  m.rag_status,
  m.url,
  m.metadata->>'sourceFileId' as source_file_id,
  m.created_at
FROM public.materials m
WHERE m.id = '82db3bb8-307c-4193-b723-cc69e337568e';

-- 2. Ver todos los chunks de este material
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id,
  ccc.metadata->>'sourceFileName' as source_file_name,
  ccc.metadata->>'sourceFileId' as source_file_id,
  ccc.metadata->>'pageStart' as page_start_camel,
  ccc.metadata->>'pageEnd' as page_end_camel,
  ccc.metadata->>'page_start' as page_start_snake,
  ccc.metadata->>'page_end' as page_end_snake,
  ccc.metadata->>'pdfType' as pdf_type,
  ccc.metadata->>'category' as category,
  LEFT(ccc.content, 200) as content_preview,
  ccc.created_at
FROM public.course_content_chunks ccc
WHERE ccc.metadata->>'material_id' = '82db3bb8-307c-4193-b723-cc69e337568e'
ORDER BY 
  CASE 
    WHEN ccc.metadata->>'page_start' ~ '^[0-9]+$' 
    THEN (ccc.metadata->>'page_start')::integer 
    WHEN ccc.metadata->>'pageStart' ~ '^[0-9]+$' 
    THEN (ccc.metadata->>'pageStart')::integer 
    ELSE 0 
  END
LIMIT 10;

-- 3. Contar chunks de este material
SELECT 
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN ccc.metadata->>'sourceFileName' IS NOT NULL THEN 1 END) as chunks_with_source_file_name,
  COUNT(CASE WHEN ccc.metadata->>'sourceFileId' IS NOT NULL THEN 1 END) as chunks_with_source_file_id,
  COUNT(CASE WHEN ccc.metadata->>'page_start' IS NOT NULL OR ccc.metadata->>'pageStart' IS NOT NULL THEN 1 END) as chunks_with_page_info
FROM public.course_content_chunks ccc
WHERE ccc.metadata->>'material_id' = '82db3bb8-307c-4193-b723-cc69e337568e';

-- 4. Verificar si hay contenido "neonatal" en los chunks de este material
SELECT 
  ccc.id,
  ccc.metadata->>'material_id' as material_id,
  ccc.metadata->>'page_start' as page_start,
  ccc.metadata->>'page_end' as page_end,
  LEFT(ccc.content, 300) as content_preview,
  CASE 
    WHEN ccc.content ILIKE '%neonatal%' THEN '✅ Contiene "neonatal"'
    WHEN ccc.content ILIKE '%manual%' THEN '✅ Contiene "manual"'
    WHEN ccc.content ILIKE '%atención%' THEN '✅ Contiene "atención"'
    ELSE '❌ No contiene términos relevantes'
  END as relevance
FROM public.course_content_chunks ccc
WHERE ccc.metadata->>'material_id' = '82db3bb8-307c-4193-b723-cc69e337568e'
  AND (ccc.content ILIKE '%neonatal%' 
       OR ccc.content ILIKE '%manual%'
       OR ccc.content ILIKE '%atención%')
ORDER BY 
  CASE 
    WHEN ccc.content ILIKE '%neonatal%' THEN 1
    WHEN ccc.content ILIKE '%manual%' THEN 2
    ELSE 3
  END
LIMIT 10;

-- 5. Verificar todos los materiales del curso 12 que NO tienen chunks
SELECT 
  m.id,
  m.title,
  m.kind,
  m.rag_status,
  m.rag_error,
  COUNT(ccc.id) as chunk_count
FROM public.materials m
LEFT JOIN public.course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text AND ccc.course_id = m.course_id
WHERE m.course_id = 12
  AND m.rag_status = 'completed'
GROUP BY m.id, m.title, m.kind, m.rag_status, m.rag_error
HAVING COUNT(ccc.id) = 0
ORDER BY m.title;

-- 6. Probar búsqueda simulando la función RPC
-- Esto simula lo que hace search_course_content_chunks_text_clean
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id,
  m.title as material_title,
  ccc.metadata->>'page_start' as page_start,
  ccc.metadata->>'page_end' as page_end,
  LEFT(ccc.content, 200) as content_preview,
  -- Simular score de relevancia básico
  CASE 
    WHEN ccc.content ILIKE '%neonatal%' THEN 100
    WHEN ccc.content ILIKE '%manual%' THEN 50
    WHEN ccc.content ILIKE '%atención%' THEN 30
    ELSE 10
  END as relevance_score
FROM public.course_content_chunks ccc
LEFT JOIN public.materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.course_id = 12
  AND (
    ccc.content ILIKE '%neonatal%' 
    OR ccc.content ILIKE '%manual%'
    OR ccc.content ILIKE '%atención%'
  )
ORDER BY relevance_score DESC, ccc.created_at DESC
LIMIT 5;

