-- =====================================================
-- Script: 153_get_course_materials_including_units.sql
-- Fecha: Enero 2025
-- Descripción: Actualiza la función get_course_materials_including_assigned para incluir
--              materiales asignados a unidades específicas mediante material_unit_assignments
--              y EVITAR DUPLICADOS en la lista general.
-- =====================================================

-- Función actualizada para obtener todos los materiales de un curso
-- Incluye:
-- 1. Materiales directos (course_id) - EXCLUYENDO los que ya están asignados a unidades
-- 2. Materiales asignados al curso - EXCLUYENDO los que ya están asignados a unidades
-- 3. Materiales asignados a unidades del curso
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
    is_assigned BOOLEAN  -- TRUE si viene de una asignación, FALSE si es directo
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
        -- 1. Materiales directos del curso (course_id = p_course_id)
        -- Solo incluimos aquellos que NO tienen una asignación específica a una unidad en este curso
        -- para evitar que aparezcan duplicados (una vez en la unidad y otra en "Otros materiales")
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
        AND (
            -- Si el material ya tiene unit_id directo, lo dejamos (se mostrará en su unidad)
            m.unit_id IS NOT NULL
            OR
            -- Si NO tiene unit_id (es general), verificamos que NO esté asignado a ninguna unidad de este curso
            NOT EXISTS (
                SELECT 1 
                FROM public.material_unit_assignments mua
                INNER JOIN public.course_units cu ON cu.id = mua.unit_id
                WHERE mua.material_id = m.id 
                AND cu.course_id = p_course_id
            )
        )
        
        UNION
        
        -- 2. Materiales asignados al curso mediante material_course_assignments
        -- Igual que arriba: excluimos si ya están asignados a una unidad específica
        SELECT 
            m.id,
            p_course_id::INTEGER as course_id,
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
        AND (m.course_id IS NULL OR m.course_id != p_course_id)
        AND NOT EXISTS (
            SELECT 1 
            FROM public.material_unit_assignments mua
            INNER JOIN public.course_units cu ON cu.id = mua.unit_id
            WHERE mua.material_id = m.id 
            AND cu.course_id = p_course_id
        )
        
        UNION
        
        -- 3. Materiales asignados a UNIDADES del curso mediante material_unit_assignments
        -- Estos son los que queremos mostrar prioritariamente dentro de sus unidades
        SELECT 
            m.id,
            p_course_id::INTEGER as course_id,
            mua.unit_id, -- IMPORTANTE: Usar el unit_id de la asignación
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
        INNER JOIN public.material_unit_assignments mua ON mua.material_id = m.id
        INNER JOIN public.course_units cu ON cu.id = mua.unit_id
        WHERE cu.course_id = p_course_id
    )
    SELECT * FROM all_materials
    ORDER BY created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_course_materials_including_assigned(INTEGER) IS 
'Obtiene todos los materiales de un curso, priorizando la ubicación específica:
- Si un material está asignado a una unidad, aparece allí.
- Si no está asignado a ninguna unidad, aparece como material general.
Evita duplicados entre la vista general y las unidades.';
