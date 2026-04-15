-- 🔧 SOLUCIÓN POR LOTES: Si el UPDATE completo da timeout, ejecutar por lotes

-- ESTRATEGIA: Actualizar en lotes de 1000 chunks a la vez
-- Ejecutar este bloque múltiples veces hasta que no afecte más filas

-- LOTE 1: Primeros 1000 chunks
UPDATE course_content_chunks
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb), 
    '{sourceFileName}', 
    '"Williams Gineco.pdf"'
)
WHERE id IN (
    SELECT id
    FROM course_content_chunks
    WHERE course_id = 12
      AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5'
      AND (metadata->>'sourceFileName' IS NULL OR metadata->>'sourceFileName' = 'null')
    LIMIT 1000
);

-- Después de ejecutar el LOTE 1, verificar cuántos quedan:
SELECT
    COUNT(*) as chunks_restantes_sin_sourceFileName
FROM course_content_chunks
WHERE course_id = 12
  AND metadata->>'material_id' = '0c4aefc6-4e81-402c-a4a7-8506d2296ab5'
  AND (metadata->>'sourceFileName' IS NULL OR metadata->>'sourceFileName' = 'null');

-- Si hay chunks restantes, ejecutar de nuevo el UPDATE (repetir hasta que el COUNT sea 0)

-- NOTA: Una alternativa es usar un script de Python o Node.js para hacer el UPDATE por lotes
-- Pero si la conexión es estable, el UPDATE directo optimizado debería funcionar