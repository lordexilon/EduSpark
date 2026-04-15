-- =====================================================
-- AUMENTAR TIMEOUT DE STATEMENT PARA INSERCIÓN DE CHUNKS
-- =====================================================
-- Este script aumenta el timeout de statement para permitir
-- inserciones masivas de chunks sin timeout

-- Aumentar statement_timeout a 10 minutos (600 segundos) para archivos grandes
-- Por defecto PostgreSQL tiene 0 (sin límite), pero Supabase puede tener límites
-- 600s permite procesar archivos de hasta 850 MB (4350+ páginas) sin timeout
ALTER DATABASE postgres SET statement_timeout = '600s';

-- También configurar para la sesión actual
SET statement_timeout = '600s';

-- Verificar configuración actual
SHOW statement_timeout;

-- Notificación
DO $$
BEGIN
    RAISE NOTICE 'Statement timeout configurado a 600 segundos (10 minutos)';
    RAISE NOTICE 'Esto permite inserciones masivas de chunks sin timeout';
    RAISE NOTICE 'Soporta archivos de hasta 850 MB (4350+ páginas)';
END $$;

