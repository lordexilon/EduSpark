-- 🚀 SUPER-FIX: Vincular Williams Gineco.pdf con sus 55,388 chunks

DO $$ 
DECLARE 
    v_material_id UUID;
    v_material_title TEXT;
BEGIN
    -- 1. Obtener el ID y título del material real
    SELECT id, title INTO v_material_id, v_material_title
    FROM materials 
    WHERE course_id = 12 
      AND (title ILIKE '%Williams Gineco%' OR file_name ILIKE '%Williams Gineco%')
    LIMIT 1;

    IF v_material_id IS NULL THEN
        RAISE NOTICE '❌ ERROR: No se encontró el material Williams Gineco en la tabla materials';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Encontrado Material ID: %, Título: %', v_material_id, v_material_title;

    -- 2. Actualizar los chunks huérfanos
    -- Seteamos sourceFileName, material_id y material_title en el JSONB de metadata
    UPDATE course_content_chunks
    SET metadata = metadata || jsonb_build_object(
        'sourceFileName', 'Williams Gineco.pdf',
        'material_id', v_material_id,
        'material_title', v_material_title
    )
    WHERE metadata->>'sourceFileName' IS NULL
      AND course_id = 12;

    -- 3. Actualizar el conteo en processed_documents para consistencia
    UPDATE processed_documents
    SET total_chunks = 55388
    WHERE title ILIKE '%Williams Gineco%';

    RAISE NOTICE '✅ Proceso completado exitosamente';
END $$;

-- 4. VERIFICACIÓN FINAL
SELECT 
    ccc.metadata->>'sourceFileName' as archivo,
    ccc.metadata->>'material_title' as material,
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN ccc.content ILIKE '%estadificación%' THEN 1 END) as chunks_con_estadificacion
FROM course_content_chunks ccc
WHERE ccc.course_id = 12
  AND ccc.metadata->>'sourceFileName' = 'Williams Gineco.pdf'
GROUP BY ccc.metadata->>'sourceFileName', ccc.metadata->>'material_title';