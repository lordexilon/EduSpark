-- =====================================================
-- SYNC SIMPLE: Un usuario a la vez, manual
-- =====================================================
-- Ejecuta SOLO para barretoisaacdavid97@gmail.com
-- =====================================================

-- PASO 1: Ver estado actual
SELECT '=== ESTADO ANTES ===' as paso;
SELECT 
    'auth.users' as tabla,
    id,
    email
FROM auth.users 
WHERE email = 'barretoisaacdavid97@gmail.com'
UNION ALL
SELECT 
    'public.users',
    id,
    email
FROM public.users 
WHERE email = 'barretoisaacdavid97@gmail.com';

-- PASO 2: Guardar datos del usuario
CREATE TEMP TABLE IF NOT EXISTS temp_user_backup AS
SELECT * FROM public.users 
WHERE email = 'barretoisaacdavid97@gmail.com';

-- PASO 3: Actualizar TODAS las FK (esto debe funcionar sin el INSERT primero)
UPDATE public.course_enrollments 
SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.career_enrollments 
SET student_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE student_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.user_institutions 
SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.conversations 
SET participant1_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE participant1_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.conversations 
SET participant2_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE participant2_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.messages 
SET sender_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE sender_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.user_tutorials 
SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.tutor_usage_limits 
SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

UPDATE public.user_devices 
SET user_id = '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2' 
WHERE user_id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

-- PASO 4: Insertar registro con ID correcto
INSERT INTO public.users (
    id, email, first_name, last_name, avatar_url, created_at, updated_at,
    role_id, email_verified, is_active, identity_document, identity_document_type
)
SELECT 
    '0cfef98f-f62d-4dbd-83d9-b173edb2e8f2'::uuid as id,
    email, first_name, last_name, avatar_url, created_at, updated_at,
    role_id, email_verified, is_active, identity_document, identity_document_type
FROM temp_user_backup
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

-- PASO 5: Eliminar registro viejo
DELETE FROM public.users 
WHERE id = '81d98181-84d7-4b7e-844f-d4cb6c541e50';

-- PASO 6: Verificar resultado
SELECT '=== ESTADO DESPUÉS ===' as paso;
SELECT 
    au.email,
    au.id as auth_id,
    pu.id as public_id,
    CASE WHEN au.id = pu.id THEN '✅ SINCRONIZADO' ELSE '❌ AÚN DESINCRONIZADO' END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'barretoisaacdavid97@gmail.com';

-- Limpiar
DROP TABLE IF EXISTS temp_user_backup;
