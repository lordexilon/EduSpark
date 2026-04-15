-- VERIFICAR: ¿Los jobs tienen sourceFileName correctamente?

-- Ver jobs hijos (process_chunk) y su sourceFileName
SELECT
    fpj.id,
    fpj.file_name,
    fpj.metadata->>'jobType' as job_type,
    fpj.metadata->>'materialId' as material_id,
    fpj.metadata->>'pageStart' as page_start,
    fpj.metadata->>'pageEnd' as page_end,
    -- Verificar si file_name está en la tabla o solo en metadata
    CASE 
        WHEN fpj.file_name IS NULL THEN 'file_name es NULL en tabla'
        ELSE 'file_name tiene valor: ' || fpj.file_name
    END as estado_file_name,
    fpj.status,
    fpj.error_message,
    fpj.created_at
FROM file_processing_jobs fpj
WHERE fpj.file_name ILIKE '%williams%gineco%'
  AND fpj.metadata->>'jobType' = 'process_chunk'
ORDER BY CAST(fpj.metadata->>'pageStart' AS INTEGER)
LIMIT 10;