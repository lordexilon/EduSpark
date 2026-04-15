-- Verificar si existe el material de Harrison y sus chunks
-- Ejecutar en Supabase SQL Editor

DO $$
DECLARE
    v_material_id UUID;
    v_chunk_count INTEGER;
    v_sample_chunk TEXT;
BEGIN
    -- 1. Buscar el material
    SELECT id INTO v_material_id
    FROM materials
    WHERE title ILIKE '%Harrison%'
    LIMIT 1;

    IF v_material_id IS NULL THEN
        RAISE NOTICE '❌ No se encontró ningún material con "Harrison" en el título.';
    ELSE
        RAISE NOTICE '✅ Material encontrado: ID %', v_material_id;
        
        -- 2. Contar chunks
        SELECT COUNT(*) INTO v_chunk_count
        FROM course_content_chunks
        WHERE metadata->>'material_id' = v_material_id::TEXT;
        
        RAISE NOTICE '📊 Cantidad de chunks encontrados: %', v_chunk_count;
        
        IF v_chunk_count > 0 THEN
            -- 3. Mostrar un ejemplo
            SELECT content INTO v_sample_chunk
            FROM course_content_chunks
            WHERE metadata->>'material_id' = v_material_id::TEXT
            LIMIT 1;
            
            RAISE NOTICE '📝 Ejemplo de contenido (primeros 200 caracteres): %', substring(v_sample_chunk from 1 for 200);
        ELSE
            RAISE NOTICE '⚠️ El material existe pero NO TIENE CHUNKS procesados. Esto explica por qué el AI no puede leerlo.';
        END IF;
    END IF;
END $$;
