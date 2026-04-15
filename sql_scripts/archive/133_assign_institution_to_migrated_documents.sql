-- =====================================================
-- Asignar institution_id a documentos migrados
-- =====================================================
-- Los documentos migrados no tienen institution_id,
-- pero podemos obtenerlo de los cursos asignados

-- 1. Verificar documentos sin institution_id
SELECT 
    'Documentos sin institution_id' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    dca.course_id,
    c.institution_id as course_institution_id,
    i.name as course_institution_name
FROM processed_documents pd
LEFT JOIN document_course_assignments dca ON dca.document_id = pd.id
LEFT JOIN courses c ON c.id = dca.course_id
LEFT JOIN institutions i ON i.id = c.institution_id
WHERE pd.institution_id IS NULL
  AND pd.title LIKE 'Documento migrado - %'
ORDER BY pd.title, c.institution_id;

-- 2. Asignar institution_id basado en los cursos asignados
-- Si un documento tiene cursos asignados, usar la institución del primer curso
UPDATE processed_documents pd
SET institution_id = (
    SELECT c.institution_id
    FROM document_course_assignments dca
    JOIN courses c ON c.id = dca.course_id
    WHERE dca.document_id = pd.id
      AND c.institution_id IS NOT NULL
    LIMIT 1
)
WHERE pd.institution_id IS NULL
  AND pd.title LIKE 'Documento migrado - %'
  AND EXISTS (
      SELECT 1
      FROM document_course_assignments dca
      JOIN courses c ON c.id = dca.course_id
      WHERE dca.document_id = pd.id
        AND c.institution_id IS NOT NULL
  );

-- 3. Verificar actualización
SELECT 
    'Documentos actualizados' as check_type,
    pd.id,
    pd.title,
    pd.institution_id,
    i.name as institution_name,
    COUNT(dca.course_id) as assigned_courses_count
FROM processed_documents pd
LEFT JOIN institutions i ON i.id = pd.institution_id
LEFT JOIN document_course_assignments dca ON dca.document_id = pd.id
WHERE pd.title LIKE 'Documento migrado - %'
GROUP BY pd.id, pd.title, pd.institution_id, i.name
ORDER BY pd.title;

-- 4. Si hay documentos que aún no tienen institution_id, asignar la institución por defecto (institución 1)
-- Solo si realmente no hay cursos asignados o los cursos no tienen institución
UPDATE processed_documents pd
SET institution_id = 1
WHERE pd.institution_id IS NULL
  AND pd.title LIKE 'Documento migrado - %'
  AND NOT EXISTS (
      SELECT 1
      FROM document_course_assignments dca
      JOIN courses c ON c.id = dca.course_id
      WHERE dca.document_id = pd.id
        AND c.institution_id IS NOT NULL
  );

-- 5. Verificación final
SELECT 
    'Estado final de documentos migrados' as check_type,
    COUNT(*) as total_migrated_documents,
    COUNT(CASE WHEN institution_id IS NOT NULL THEN 1 END) as with_institution,
    COUNT(CASE WHEN institution_id IS NULL THEN 1 END) as without_institution,
    COUNT(DISTINCT institution_id) as distinct_institutions
FROM processed_documents
WHERE title LIKE 'Documento migrado - %';

