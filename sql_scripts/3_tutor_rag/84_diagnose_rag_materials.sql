-- =====================================================
-- Script: Diagnóstico de Materiales RAG
-- Descripción: Verifica que los materiales estén procesados
--              y que los chunks estén correctamente asociados al curso
-- Fecha: 2025-12-01
-- =====================================================

-- 0. Verificar si las columnas RAG existen
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'materials'
  AND column_name IN ('rag_status', 'rag_error', 'updated_at')
ORDER BY column_name;

-- 1. Verificar materiales del curso con estado RAG
-- Nota: Si las columnas rag_status y rag_error no existen, ejecuta primero: sql_scripts/04_add_material_fields.sql
SELECT 
  m.id,
  m.title,
  m.kind,
  m.course_id,
  m.rag_status,  -- Puede dar error si la columna no existe
  m.rag_error,   -- Puede dar error si la columna no existe
  m.created_at
FROM public.materials m
WHERE m.course_id = 12  -- Cambiar por el ID del curso que estás usando
ORDER BY m.created_at DESC;

-- 2. Verificar chunks asociados a materiales del curso
-- Nota: material_id está en metadata (JSONB), no como columna directa
SELECT 
  ccc.id,
  ccc.metadata->>'material_id' as material_id,
  m.title as material_title,
  ccc.course_id,
  LEFT(ccc.content, 100) as content_preview,
  ccc.metadata->>'sourceFileName' as source_file,
  ccc.metadata->>'pageStart' as page_start,
  ccc.metadata->>'pageEnd' as page_end,
  ccc.created_at
FROM public.course_content_chunks ccc
LEFT JOIN public.materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.course_id = 12  -- Cambiar por el ID del curso que estás usando
ORDER BY ccc.created_at DESC
LIMIT 20;

-- 3. Contar chunks por material
-- Nota: material_id está en metadata (JSONB)
SELECT 
  m.id,
  m.title,
  m.rag_status,  -- Puede dar error si la columna no existe
  COUNT(ccc.id) as chunk_count
FROM public.materials m
LEFT JOIN public.course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.course_id = 12  -- Cambiar por el ID del curso que estás usando
GROUP BY m.id, m.title, m.rag_status
ORDER BY chunk_count DESC;

-- 4. Verificar si hay materiales con "Neonatal" en el título
-- Nota: material_id está en metadata (JSONB)
SELECT 
  m.id,
  m.title,
  m.kind,
  m.course_id,
  m.rag_status,  -- Puede dar error si la columna no existe
  COUNT(ccc.id) as chunk_count
FROM public.materials m
LEFT JOIN public.course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text
WHERE m.course_id = 12  -- Cambiar por el ID del curso que estás usando
  AND (m.title ILIKE '%neonatal%' OR m.title ILIKE '%manual%')
GROUP BY m.id, m.title, m.kind, m.course_id, m.rag_status
ORDER BY m.title;

-- 5. Verificar chunks que contienen "neonatal" en el contenido
-- Nota: material_id está en metadata (JSONB)
SELECT 
  ccc.id,
  ccc.metadata->>'material_id' as material_id,
  m.title as material_title,
  LEFT(ccc.content, 200) as content_preview,
  ccc.metadata->>'sourceFileName' as source_file,
  ccc.metadata->>'pageStart' as page_start
FROM public.course_content_chunks ccc
LEFT JOIN public.materials m ON m.id::text = ccc.metadata->>'material_id'
WHERE ccc.course_id = 12  -- Cambiar por el ID del curso que estás usando
  AND (ccc.content ILIKE '%neonatal%' OR ccc.content ILIKE '%manual%')
ORDER BY ccc.created_at DESC
LIMIT 10;

-- 6. Verificar función RPC de búsqueda (si existe)
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%search_course_content%'
ORDER BY routine_name;

-- 7. Verificar materiales sin procesar o con errores
-- Nota: Esta consulta requiere que las columnas rag_status y rag_error existan
-- Si da error, ejecuta primero: sql_scripts/04_add_material_fields.sql
SELECT 
  m.id,
  m.title,
  m.rag_status,
  m.rag_error,
  m.created_at
FROM public.materials m
WHERE m.course_id = 12  -- Cambiar por el ID del curso que estás usando
  AND (m.rag_status IS NULL 
       OR m.rag_status NOT IN ('completed', 'readonly')
       OR m.rag_error IS NOT NULL)
ORDER BY m.created_at DESC;

-- 8. Resumen general
-- Nota: Esta consulta requiere que la columna rag_status exista
-- Si da error, ejecuta primero: sql_scripts/04_add_material_fields.sql
-- Nota: material_id está en metadata (JSONB)
SELECT 
  COUNT(DISTINCT m.id) as total_materials,
  COUNT(DISTINCT CASE WHEN m.rag_status = 'completed' THEN m.id END) as materials_completed,
  COUNT(DISTINCT CASE WHEN m.rag_status = 'readonly' THEN m.id END) as materials_readonly,
  COUNT(DISTINCT CASE WHEN m.rag_status IS NULL OR m.rag_status NOT IN ('completed', 'readonly') THEN m.id END) as materials_pending,
  COUNT(DISTINCT ccc.id) as total_chunks,
  COUNT(DISTINCT ccc.metadata->>'material_id') as materials_with_chunks
FROM public.materials m
LEFT JOIN public.course_content_chunks ccc ON ccc.metadata->>'material_id' = m.id::text AND ccc.course_id = m.course_id
WHERE m.course_id = 12;  -- Cambiar por el ID del curso que estás usando

