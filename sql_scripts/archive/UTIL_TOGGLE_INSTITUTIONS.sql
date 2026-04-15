-- Script de utilidad para activar/desactivar instituciones
-- Este script proporciona ejemplos y funciones helper para gestionar el estado de las instituciones

-- =====================================================
-- CONSULTAS DE VISUALIZACIÓN
-- =====================================================

-- Ver todas las instituciones con su estado
SELECT 
    id,
    name,
    is_active,
    CASE 
        WHEN is_active THEN '✓ Visible en landing'
        ELSE '✗ Oculta en landing'
    END as visibilidad,
    created_at,
    updated_at
FROM institutions
ORDER BY name;

-- Ver solo instituciones activas (las que aparecen en landing)
SELECT id, name
FROM institutions
WHERE is_active = true
ORDER BY name;

-- Ver solo instituciones inactivas
SELECT id, name
FROM institutions
WHERE is_active = false
ORDER BY name;

-- =====================================================
-- ACTIVAR/DESACTIVAR INSTITUCIONES
-- =====================================================

-- MÉTODO 1: Por ID de institución
-- Activar
UPDATE institutions
SET 
    is_active = true,
    updated_at = NOW()
WHERE id = 1;  -- Reemplaza con el ID de la institución

-- Desactivar
UPDATE institutions
SET 
    is_active = false,
    updated_at = NOW()
WHERE id = 1;  -- Reemplaza con el ID de la institución

-- MÉTODO 2: Por nombre de institución
-- Activar
UPDATE institutions
SET 
    is_active = true,
    updated_at = NOW()
WHERE name = 'Nombre de la Institución';

-- Desactivar
UPDATE institutions
SET 
    is_active = false,
    updated_at = NOW()
WHERE name = 'Nombre de la Institución';

-- MÉTODO 3: Toggle (cambiar al estado opuesto)
UPDATE institutions
SET 
    is_active = NOT is_active,
    updated_at = NOW()
WHERE id = 1;  -- Reemplaza con el ID

-- =====================================================
-- OPERACIONES EN LOTE
-- =====================================================

-- Activar todas las instituciones
UPDATE institutions
SET 
    is_active = true,
    updated_at = NOW();

-- Desactivar todas las instituciones
UPDATE institutions
SET 
    is_active = false,
    updated_at = NOW();

-- Activar solo instituciones con email configurado
UPDATE institutions
SET 
    is_active = true,
    updated_at = NOW()
WHERE email IS NOT NULL AND email != '';

-- Activar instituciones creadas recientemente (últimos 30 días)
UPDATE institutions
SET 
    is_active = true,
    updated_at = NOW()
WHERE created_at >= NOW() - INTERVAL '30 days';

-- =====================================================
-- FUNCIÓN HELPER: Activar/Desactivar con validación
-- =====================================================

-- Crear función para activar institución de forma segura
CREATE OR REPLACE FUNCTION toggle_institution_status(
    institution_id INTEGER,
    new_status BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    old_status BOOLEAN,
    new_status BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_institution RECORD;
    v_new_status BOOLEAN;
BEGIN
    -- Obtener información actual de la institución
    SELECT * INTO v_institution
    FROM institutions
    WHERE institutions.id = institution_id;
    
    -- Verificar que la institución existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Institución con ID % no encontrada', institution_id;
    END IF;
    
    -- Determinar el nuevo estado
    IF new_status IS NULL THEN
        -- Si no se especifica, hacer toggle
        v_new_status := NOT v_institution.is_active;
    ELSE
        v_new_status := new_status;
    END IF;
    
    -- Actualizar el estado
    UPDATE institutions
    SET 
        is_active = v_new_status,
        updated_at = NOW()
    WHERE institutions.id = institution_id;
    
    -- Retornar información
    RETURN QUERY
    SELECT 
        v_institution.id,
        v_institution.name::TEXT,
        v_institution.is_active as old_status,
        v_new_status,
        CASE 
            WHEN v_new_status THEN 'Institución activada - Ahora visible en landing page'
            ELSE 'Institución desactivada - Oculta en landing page'
        END::TEXT as message;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EJEMPLOS DE USO DE LA FUNCIÓN
-- =====================================================

-- Toggle (cambiar al estado opuesto)
SELECT * FROM toggle_institution_status(1);

-- Activar específicamente
SELECT * FROM toggle_institution_status(1, true);

-- Desactivar específicamente
SELECT * FROM toggle_institution_status(1, false);

-- =====================================================
-- CONSULTAS DE AUDITORÍA
-- =====================================================

-- Ver historial de cambios recientes (si tienes tabla de auditoría)
-- Si no tienes auditoría, puedes ver solo la última actualización
SELECT 
    id,
    name,
    is_active,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 as horas_desde_cambio
FROM institutions
ORDER BY updated_at DESC;

-- Ver instituciones y contar sus usuarios
SELECT 
    i.id,
    i.name,
    i.is_active,
    COUNT(ui.user_id) as total_usuarios
FROM institutions i
LEFT JOIN user_institutions ui ON i.id = ui.institution_id
GROUP BY i.id, i.name, i.is_active
ORDER BY total_usuarios DESC;

-- =====================================================
-- VALIDACIONES
-- =====================================================

-- Verificar que hay al menos una institución activa
DO $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM institutions
    WHERE is_active = true;
    
    IF active_count = 0 THEN
        RAISE WARNING 'No hay instituciones activas. La landing page no mostrará ninguna institución.';
    ELSE
        RAISE NOTICE '✓ Hay % institución(es) activa(s)', active_count;
    END IF;
END $$;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. EFECTO EN LANDING PAGE:
   - Solo las instituciones con is_active = true aparecen en la landing page
   - El cambio es inmediato y no requiere reiniciar la aplicación

2. EFECTO EN USUARIOS:
   - Los usuarios asignados a una institución inactiva SIGUEN TENIENDO ACCESO
   - Solo afecta la visibilidad pública en la landing page
   - Los usuarios pueden seguir trabajando normalmente

3. PERMISOS:
   - Solo el rol 'admin' puede activar/desactivar instituciones vía UI
   - Admin-campus y coordinator solo pueden ver el estado

4. BUENAS PRÁCTICAS:
   - Desactivar instituciones que ya no están operativas
   - Mantener activas solo las instituciones que quieres mostrar públicamente
   - Verificar que tengan logo y descripción antes de activar
*/
