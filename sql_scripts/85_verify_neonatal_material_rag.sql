-- =====================================================
-- Script: Verificación específica del material "Manual de atención Neonatal"
-- Descripción: Verifica si el material está procesado y tiene chunks asociados
-- Fecha: 2025-12-01
-- =====================================================

-- 1. Buscar el material "Manual de atención Neonatal" o similar
SELECT 
  m.id,
  m.title,
  m.kind,
  m.course_id,
  m.rag_status,
  m.rag_error,
  m.created_at
FROM public.materials m
WHERE m.course_id = 12  -- Cambiar por el ID del curso que estás usando
  AND (m.title ILIKE '%neonatal%' 
       OR m.title ILIKE '%manual%' 
       OR m.title ILIKE '%atención%')
ORDER BY m.title;

-- 2. Verificar chunks del material "Manual de atención Neonatal"
-- Primero necesitamos el ID del material de la consulta anterior
-- Reemplaza 'MATERIAL_ID_AQUI' con el ID real del material
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id,
  ccc.metadata->>'sourceFileName' as source_file,
  ccc.metadata->>'pageStart' as page_start,
  ccc.metadata->>'pageEnd' as page_end,
  LEFT(ccc.content, 300) as content_preview,
  ccc.created_at
FROM public.course_content_chunks ccc
WHERE ccc.course_id = 12  -- Cambiar por el ID del curso que estás usando
  AND ccc.metadata->>'material_id' IN (
    SELECT m.id::text
    FROM public.materials m
    WHERE m.course_id = 12
      AND (m.title ILIKE '%neonatal%' 
           OR m.title ILIKE '%manual%' 
           OR m.title ILIKE '%atención%')
  )
ORDER BY 
  CASE 
    WHEN ccc.metadata->>'pageStart' ~ '^[0-9]+$' 
    THEN (ccc.metadata->>'pageStart')::integer 
    ELSE 0 
  END,
  ccc.created_at
LIMIT 20;

-- 3. Contar chunks por material que contenga "neonatal" o "manual"
SELECT 
  m.id,
  m.title,
  m.rag_status,
  COUNT(ccc.id) as chunk_count,
  MIN(CASE 
    WHEN ccc.metadata->>'pageStart' ~ '^[0-9]+$' 
    THEN (ccc.metadata->>'pageStart')::integer 
    ELSE NULL 
  END) as min_page,
  MAX(CASE 
    WHEN ccc.metadata->>'pageEnd' ~ '^[0-9]+$' 
    THEN (ccc.metadata->>'pageEnd')::integer 
    ELSE NULL 
  END) as max_page
FROM public.materials m
LEFT JOIN public.course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text AND ccc.course_id = m.course_id
WHERE m.course_id = 12  -- Cambiar por el ID del curso que estás usando
  AND (m.title ILIKE '%neonatal%' 
       OR m.title ILIKE '%manual%' 
       OR m.title ILIKE '%atención%')
GROUP BY m.id, m.title, m.rag_status
ORDER BY chunk_count DESC, m.title;

-- 4. Verificar si los chunks tienen el course_id correcto
SELECT 
  ccc.course_id,
  COUNT(*) as chunk_count,
  COUNT(DISTINCT ccc.metadata->>'material_id') as unique_materials
FROM public.course_content_chunks ccc
WHERE ccc.metadata->>'material_id' IN (
  SELECT m.id::text
  FROM public.materials m
  WHERE m.course_id = 12
    AND (m.title ILIKE '%neonatal%' 
         OR m.title ILIKE '%manual%' 
         OR m.title ILIKE '%atención%')
)
GROUP BY ccc.course_id;

-- 5. Verificar función RPC de búsqueda con ejemplo de consulta
-- Esta consulta simula lo que hace el tutor virtual
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'search_course_content_chunks_text_clean'
LIMIT 1;

-- 6. Probar búsqueda directa de "neonatal" en chunks
SELECT 
  ccc.id,
  ccc.metadata->>'material_id' as material_id,
  m.title as material_title,
  ccc.metadata->>'sourceFileName' as source_file,
  ccc.metadata->>'pageStart' as page_start,
  LEFT(ccc.content, 200) as content_preview,
  -- Simular relevancia básica
  CASE 
    WHEN ccc.content ILIKE '%neonatal%' THEN 1
    ELSE 0
  END as has_neonatal
FROM public.course_content_chunks ccc
LEFT JOIN public.materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.course_id = 12  -- Cambiar por el ID del curso que estás usando
  AND (ccc.content ILIKE '%neonatal%' 
       OR ccc.content ILIKE '%manual%'
       OR ccc.content ILIKE '%atención%')
ORDER BY has_neonatal DESC, ccc.created_at DESC
LIMIT 10;

-- 7. Verificar estructura de metadata de los chunks
SELECT 
  ccc.id,
  ccc.course_id,
  ccc.metadata->>'material_id' as material_id,
  ccc.metadata->>'sourceFileName' as source_file,
  jsonb_object_keys(ccc.metadata) as metadata_keys
FROM public.course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'material_id' IS NOT NULL
LIMIT 5;

