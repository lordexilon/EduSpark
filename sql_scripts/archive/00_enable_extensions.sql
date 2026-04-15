-- =====================================================
-- PASO 1: HABILITAR EXTENSIONES NECESARIAS
-- =====================================================

-- Habilitar extensión de búsqueda de texto completo
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Habilitar extensión de texto completo (si no está habilitada)
-- Nota: En Supabase, esto ya debería estar habilitado por defecto

-- =====================================================
-- PASO 2: EJECUTAR EL SCRIPT MULTIIDIOMA
-- =====================================================

-- Ahora ejecuta el contenido de OPTIMIZE_search_functions_multilang.sql
-- O simplemente ejecuta ese archivo completo después de este

-- Para verificar que las extensiones están habilitadas:
SELECT * FROM pg_extension WHERE extname IN ('pg_trgm', 'plpgsql');

-- Si ves resultados, las extensiones están habilitadas
-- Si no, contacta al soporte de Supabase
