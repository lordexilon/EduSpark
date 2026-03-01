-- VERIFICAR: ¿Por qué no se encuentra la estadificación del cáncer de mama?
-- Buscar específicamente en Williams Gineco.pdf

-- 1. Verificar que Williams Gineco.pdf existe y tiene chunks
SELECT
    'Total chunks en Williams Gineco.pdf' as descripcion,
    COUNT(*) as cantidad
FROM course_content_chunks ccc
WHERE ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
   OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%';

-- 2. Verificar si hay chunks con "estadificación" o "estadio" en Williams Gineco.pdf
SELECT
    'Chunks con estadificación/estadio en Williams Gineco.pdf' as descripcion,
    COUNT(*) as cantidad
FROM course_content_chunks ccc
WHERE (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND (ccc.content ILIKE '%estadificación%'
       OR ccc.content ILIKE '%estadio%'
       OR ccc.content ILIKE '%cancer%'
       OR ccc.content ILIKE '%mama%');

-- 3. Mostrar contenido de chunks relevantes (solo primeros 1000 caracteres)
SELECT
    ccc.id,
    ccc.metadata->>'sourceFileName' as archivo,
    ccc.metadata->>'pageStart' as pagina_inicio,
    ccc.metadata->>'pageEnd' as pagina_fin,
    LEFT(ccc.content, 1000) as contenido_preview
FROM course_content_chunks ccc
WHERE (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND (ccc.content ILIKE '%estadificación%'
       OR ccc.content ILIKE '%estadio%'
       OR ccc.content ILIKE '%cancer%'
       OR ccc.content ILIKE '%mama%')
ORDER BY CAST(ccc.metadata->>'pageStart' AS INTEGER)
LIMIT 5;

-- 4. Verificar si hay chunks alrededor de la página 349-370
SELECT
    'Chunks en páginas 340-380' as descripcion,
    COUNT(*) as cantidad
FROM course_content_chunks ccc
WHERE (ccc.metadata->>'sourceFileName' ILIKE '%williams%gineco%'
       OR ccc.metadata->>'sourceFileName' ILIKE '%williams%ginec%')
  AND CAST(COALESCE(ccc.metadata->>'pageStart', '0') AS INTEGER) BETWEEN 340 AND 380;