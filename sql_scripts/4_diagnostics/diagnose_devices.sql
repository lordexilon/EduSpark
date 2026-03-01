-- Diagnóstico y Corrección de Dispositivos - 22 Diciembre 2024
-- Este script diagnostica por qué ningún dispositivo aparece como activo

-- =========================================
-- PASO 1: Diagnóstico - Ver todos los dispositivos del usuario
-- =========================================

-- Buscar dispositivos para el usuario que tiene problemas
SELECT 
    id,
    device_name,
    device_type,
    browser,
    os,
    session_id,
    is_active,
    last_activity_at,
    created_at
FROM public.user_devices
WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
ORDER BY last_activity_at DESC
LIMIT 10;

-- =========================================
-- PASO 2: Verificar cuántos dispositivos activos tiene
-- =========================================

SELECT 
    is_active,
    COUNT(*) as cantidad
FROM public.user_devices
WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
GROUP BY is_active;

-- =========================================
-- PASO 3: CORRECCIÓN - Activar el dispositivo más reciente
-- (basado en last_activity_at)
-- =========================================

-- Primero, verifica el dispositivo más reciente:
SELECT 
    id,
    device_name,
    session_id,
    last_activity_at,
    is_active
FROM public.user_devices
WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
ORDER BY last_activity_at DESC
LIMIT 1;

-- =========================================
-- PASO 4: Aplicar corrección (EJECUTAR MANUALMENTE)
-- Descomenta las siguientes líneas para aplicar
-- =========================================

-- Opción A: Activar SOLO el dispositivo más reciente (mantener 1 sesión activa)
/*
UPDATE public.user_devices
SET is_active = TRUE
WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
  AND id = (
    SELECT id 
    FROM public.user_devices 
    WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
    ORDER BY last_activity_at DESC
    LIMIT 1
  );
*/

-- Verificar corrección:
SELECT 
    is_active,
    COUNT(*) as cantidad
FROM public.user_devices
WHERE user_id = '228e43a9-d78d-4117-ab00-a01a39df51d3'
GROUP BY is_active;
