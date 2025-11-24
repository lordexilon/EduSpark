-- =====================================================
-- Encontrar TODOS los documentos procesados
-- =====================================================
-- Analizar por qué solo hay 2 en processed_documents
-- cuando hay muchos más documentos procesados

-- 1. Contar documentos en processed_documents
SELECT 
    'Documentos en processed_documents' as check_type,
    COUNT(*) as total_count,
    COUNT(DISTINCT institution_id) as distinct_institutions
FROM processed_documents;

-- 2. Contar chunks únicos por document_id (documentos procesados)
SELECT 
    'Documentos únicos en chunks' as check_type,
    COUNT(DISTINCT document_id) as unique_documents_in_chunks,
    COUNT(*) as total_chunks
FROM course_content_chunks
WHERE document_id IS NOT NULL;

-- 3. Comparar: document_ids en chunks vs processed_documents
SELECT 
    'Documentos en chunks pero NO en processed_documents' as check_type,
    ccc.document_id,
    COUNT(*) as chunks_count,
    MIN(ccc.created_at) as first_chunk_date,
    MAX(ccc.created_at) as last_chunk_date,
    STRING_AGG(DISTINCT ccc.metadata->>'sourceFileId', ', ') FILTER (WHERE ccc.metadata->>'sourceFileId' IS NOT NULL) as source_file_ids
FROM course_content_chunks ccc
WHERE ccc.document_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM processed_documents pd 
      WHERE pd.id = ccc.document_id
  )
GROUP BY ccc.document_id
ORDER BY chunks_count DESC;

-- 4. Ver todos los document_ids únicos en chunks
SELECT 
    'Todos los document_ids en chunks' as check_type,
    ccc.document_id,
    COUNT(*) as chunks_count,
    COUNT(DISTINCT ccc.course_id) as courses_count,
    MIN(ccc.created_at) as first_chunk_date,
    MAX(ccc.created_at) as last_chunk_date
FROM course_content_chunks ccc
WHERE ccc.document_id IS NOT NULL
GROUP BY ccc.document_id
ORDER BY chunks_count DESC;

-- 5. Verificar si hay materials que deberían estar en processed_documents
SELECT 
    'Materials que podrían ser documentos procesados' as check_type,
    m.id as material_id,
    m.title,
    m.course_id,
    c.title as course_title,
    c.institution_id,
    m.url,
    m.metadata->>'sourceFileId' as source_file_id,
    m.metadata->>'source' as source,
    m.created_at
FROM materials m
JOIN courses c ON c.id = m.course_id
WHERE m.metadata->>'sourceFileId' IS NOT NULL
   OR m.url LIKE '%supabase.co/storage%'
ORDER BY m.created_at DESC
LIMIT 20;

-- 6. Buscar documentos procesados por título en chunks metadata
SELECT 
    'Títulos de documentos en metadata de chunks' as check_type,
    ccc.metadata->>'title' as document_title,
    ccc.document_id,
    COUNT(*) as chunks_with_title
FROM course_content_chunks ccc
WHERE ccc.metadata->>'title' IS NOT NULL
  AND ccc.document_id IS NOT NULL
GROUP BY ccc.document_id, ccc.metadata->>'title'
ORDER BY chunks_with_title DESC
LIMIT 20;

-- 7. Verificar si hay documentos con institution_id NULL en processed_documents
SELECT 
    'Documentos en processed_documents sin institution_id' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    pd.processing_status,
    pd.total_chunks,
    pd.created_at
FROM processed_documents pd
WHERE pd.institution_id IS NULL
ORDER BY pd.created_at DESC;

-- 8. Resumen: Comparación completa
SELECT 
    'RESUMEN: Comparación de documentos' as check_type,
    (SELECT COUNT(*) FROM processed_documents) as in_processed_documents,
    (SELECT COUNT(DISTINCT document_id) FROM course_content_chunks WHERE document_id IS NOT NULL) as in_chunks,
    (SELECT COUNT(DISTINCT document_id) FROM course_content_chunks 
     WHERE document_id IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM processed_documents WHERE id = document_id)) as in_chunks_not_in_processed;

-- 9. Ver los primeros 10 document_ids que están en chunks pero no en processed_documents
SELECT 
    'Ejemplos: Documentos en chunks pero NO en processed_documents' as check_type,
    ccc.document_id,
    COUNT(*) as chunks_count,
    STRING_AGG(DISTINCT ccc.metadata->>'title', ' | ') FILTER (WHERE ccc.metadata->>'title' IS NOT NULL) as titles_in_metadata,
    STRING_AGG(DISTINCT ccc.metadata->>'sourceFileId', ', ') FILTER (WHERE ccc.metadata->>'sourceFileId' IS NOT NULL) as source_file_ids,
    MIN(ccc.created_at) as first_chunk_date
FROM course_content_chunks ccc
WHERE ccc.document_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM processed_documents pd 
      WHERE pd.id = ccc.document_id
  )
GROUP BY ccc.document_id
ORDER BY chunks_count DESC
LIMIT 10;

