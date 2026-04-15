-- =====================================================
-- Verificación de la migración de asignaciones de materiales
-- =====================================================
-- Este script verifica que las tablas se crearon correctamente
-- y que los datos se migraron correctamente

-- 1. Verificar que las tablas existen
SELECT 
    'Tablas creadas' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_unit_assignments')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_session_assignments')
        THEN '✅ Ambas tablas existen'
        ELSE '❌ Faltan tablas'
    END as status;

-- 2. Verificar que las funciones RPC existen
SELECT 
    'Funciones RPC' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_material_units')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_material_sessions')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assign_material_to_units')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assign_material_to_sessions')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'unassign_material_from_unit')
        AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'unassign_material_from_session')
        THEN '✅ Todas las funciones existen'
        ELSE '❌ Faltan funciones'
    END as status;

-- 3. Estadísticas de materiales con unit_id/session_id originales
SELECT 
    'Materiales con unit_id original' as check_type,
    COUNT(*) as count
FROM public.materials
WHERE unit_id IS NOT NULL;

SELECT 
    'Materiales con session_id original' as check_type,
    COUNT(*) as count
FROM public.materials
WHERE session_id IS NOT NULL;

-- 4. Estadísticas de asignaciones migradas
SELECT 
    'Asignaciones de unidades migradas' as check_type,
    COUNT(*) as count
FROM public.material_unit_assignments;

SELECT 
    'Asignaciones de sesiones migradas' as check_type,
    COUNT(*) as count
FROM public.material_session_assignments;

-- 5. Verificar que todos los unit_id fueron migrados
SELECT 
    'Verificación unit_id migrados' as check_type,
    COUNT(DISTINCT m.id) as materiales_con_unit_id,
    COUNT(DISTINCT mua.material_id) as materiales_migrados,
    CASE 
        WHEN COUNT(DISTINCT m.id) = COUNT(DISTINCT mua.material_id) 
        THEN '✅ Todos migrados'
        ELSE '⚠️ Faltan por migrar: ' || (COUNT(DISTINCT m.id) - COUNT(DISTINCT mua.material_id))
    END as status
FROM public.materials m
LEFT JOIN public.material_unit_assignments mua ON mua.material_id = m.id AND mua.unit_id = m.unit_id
WHERE m.unit_id IS NOT NULL;

-- 6. Verificar que todos los session_id fueron migrados
SELECT 
    'Verificación session_id migrados' as check_type,
    COUNT(DISTINCT m.id) as materiales_con_session_id,
    COUNT(DISTINCT msa.material_id) as materiales_migrados,
    CASE 
        WHEN COUNT(DISTINCT m.id) = COUNT(DISTINCT msa.material_id) 
        THEN '✅ Todos migrados'
        ELSE '⚠️ Faltan por migrar: ' || (COUNT(DISTINCT m.id) - COUNT(DISTINCT msa.material_id))
    END as status
FROM public.materials m
LEFT JOIN public.material_session_assignments msa ON msa.material_id = m.id AND msa.session_id = m.session_id
WHERE m.session_id IS NOT NULL;

-- 7. Detalle de materiales con unit_id pero sin migración
SELECT 
    'Materiales con unit_id sin migrar' as check_type,
    m.id as material_id,
    m.title as material_title,
    m.unit_id,
    cu.title as unit_title,
    c.title as course_title
FROM public.materials m
JOIN public.courses c ON c.id = m.course_id
LEFT JOIN public.course_units cu ON cu.id = m.unit_id
LEFT JOIN public.material_unit_assignments mua ON mua.material_id = m.id AND mua.unit_id = m.unit_id
WHERE m.unit_id IS NOT NULL
  AND mua.id IS NULL;

-- 8. Detalle de materiales con session_id pero sin migración
SELECT 
    'Materiales con session_id sin migrar' as check_type,
    m.id as material_id,
    m.title as material_title,
    m.session_id,
    s.title as session_title,
    c.title as course_title
FROM public.materials m
JOIN public.courses c ON c.id = m.course_id
LEFT JOIN public.sessions s ON s.id = m.session_id
LEFT JOIN public.material_session_assignments msa ON msa.material_id = m.id AND msa.session_id = m.session_id
WHERE m.session_id IS NOT NULL
  AND msa.id IS NULL;

-- 9. Verificar RLS policies
SELECT 
    'RLS Policies - material_unit_assignments' as check_type,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'material_unit_assignments';

SELECT 
    'RLS Policies - material_session_assignments' as check_type,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'material_session_assignments';

-- 10. Resumen final
SELECT 
    'RESUMEN FINAL' as check_type,
    (SELECT COUNT(*) FROM public.materials WHERE unit_id IS NOT NULL) as materiales_con_unit_id_original,
    (SELECT COUNT(*) FROM public.material_unit_assignments) as asignaciones_unidades_migradas,
    (SELECT COUNT(*) FROM public.materials WHERE session_id IS NOT NULL) as materiales_con_session_id_original,
    (SELECT COUNT(*) FROM public.material_session_assignments) as asignaciones_sesiones_migradas,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.materials WHERE unit_id IS NOT NULL) = (SELECT COUNT(*) FROM public.material_unit_assignments)
        AND (SELECT COUNT(*) FROM public.materials WHERE session_id IS NOT NULL) = (SELECT COUNT(*) FROM public.material_session_assignments)
        THEN '✅ Migración completa'
        ELSE '⚠️ Revisar migración'
    END as estado_migracion;

