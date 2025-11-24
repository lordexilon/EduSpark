-- =====================================================
-- Script: 148_get_course_materials_including_assigned.sql
-- Fecha: Enero 2025
-- Descripción: Función para obtener todos los materiales de un curso
--              incluyendo los asignados mediante material_course_assignments
-- =====================================================
--
-- PROBLEMA:
-- El método getCourseMaterials solo obtenía materiales donde course_id = courseId,
-- pero no incluía materiales asignados a través de material_course_assignments.
-- Esto causaba que los materiales asignados no se visualizaran en las páginas de cursos.
--
-- SOLUCIÓN:
-- Crear función SQL que combine materiales directos (course_id) con materiales
-- asignados (material_course_assignments) usando UNION para evitar duplicados.
--
-- =====================================================

-- Función para obtener todos los materiales de un curso
-- Incluye materiales directos (course_id) y asignados (material_course_assignments)
CREATE OR REPLACE FUNCTION public.get_course_materials_including_assigned(
    p_course_id INTEGER
)
RETURNS TABLE (
    id UUID,
    course_id INTEGER,
    unit_id UUID,
    session_id UUID,
    title TEXT,
    kind TEXT,
    url TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    purpose TEXT,
    category TEXT,
    rag_status TEXT,
    processed_at TIMESTAMPTZ,
    is_assigned BOOLEAN  -- TRUE si viene de material_course_assignments, FALSE si es directo
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    -- Combinar materiales directos y asignados usando UNION
    WITH all_materials AS (
        -- Materiales directos del curso (course_id = p_course_id)
        SELECT 
            m.id,
            m.course_id,
            m.unit_id,
            m.session_id,
            m.title::TEXT,
            m.kind::TEXT,
            m.url,
            m.mime_type,
            m.size_bytes,
            m.metadata,
            m.created_at,
            COALESCE(m.purpose, 'rag')::TEXT as purpose,
            COALESCE(m.category, 'other')::TEXT as category,
            COALESCE(m.rag_status, 'pending')::TEXT as rag_status,
            m.processed_at,
            false as is_assigned
        FROM public.materials m
        WHERE m.course_id = p_course_id
        
        UNION
        
        -- Materiales asignados al curso mediante material_course_assignments
        SELECT 
            m.id,
            p_course_id::INTEGER as course_id,  -- Usar el course_id del parámetro
            m.unit_id,
            m.session_id,
            m.title::TEXT,
            m.kind::TEXT,
            m.url,
            m.mime_type,
            m.size_bytes,
            m.metadata,
            m.created_at,
            COALESCE(m.purpose, 'rag')::TEXT as purpose,
            COALESCE(m.category, 'other')::TEXT as category,
            COALESCE(m.rag_status, 'pending')::TEXT as rag_status,
            m.processed_at,
            true as is_assigned
        FROM public.materials m
        INNER JOIN public.material_course_assignments mca ON mca.material_id = m.id
        WHERE mca.course_id = p_course_id
          AND (m.course_id IS NULL OR m.course_id != p_course_id)  -- Evitar duplicados
    )
    SELECT * FROM all_materials
    ORDER BY created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_course_materials_including_assigned(INTEGER) IS 
'Obtiene todos los materiales de un curso, incluyendo:
- Materiales directos (donde materials.course_id = p_course_id)
- Materiales asignados (mediante material_course_assignments)
El campo is_assigned indica si el material fue asignado o es directo del curso.';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- 
-- VERIFICACIÓN POST-EJECUCIÓN:
-- SELECT * FROM get_course_materials_including_assigned(1);
--
-- NOTAS IMPORTANTES:
-- - Esta función es idempotente: puede ejecutarse múltiples veces
-- - Usa UNION para evitar duplicados si un material tiene course_id directo Y está asignado
-- - El campo is_assigned ayuda a distinguir el origen del material
-- =====================================================

