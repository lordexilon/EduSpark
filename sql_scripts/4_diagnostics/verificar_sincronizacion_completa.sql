-- =====================================================
-- VERIFICACIÓN FINAL: Todos los usuarios sincronizados
-- =====================================================

-- 1. VERIFICACIÓN GENERAL: Estado de sincronización
SELECT 
    au.email,
    CASE 
        WHEN au.id = pu.id THEN '✅ Sincronizado'
        WHEN pu.id IS NULL THEN '⚠️ Sin public.users'
        ELSE '❌ IDs diferentes'
    END as estado,
    au.id as auth_id,
    pu.id as public_id,
    pu.first_name,
    pu.last_name,
    r.name as rol
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
LEFT JOIN public.roles r ON pu.role_id = r.id
WHERE au.email = ANY(ARRAY[
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'sebastian.riosv00@gmail.com',
    'alecaceres6@outlook.com',
    'florenciadelgado061@gmail.com',
    'cotilaco@gmail.com',
    'magameister11@gmail.com',
    'barretoisaacdavid97@gmail.com',
    'melgarejo.lia98@gmail.com',
    'palomaruizdiaz96@gmail.com'
])
ORDER BY estado DESC, au.email;

-- 2. RESUMEN EJECUTIVO
SELECT 
    COUNT(*) as total_usuarios,
    SUM(CASE WHEN au.id = pu.id THEN 1 ELSE 0 END) as sincronizados,
    SUM(CASE WHEN au.id != pu.id THEN 1 ELSE 0 END) as desincronizados,
    SUM(CASE WHEN pu.id IS NULL THEN 1 ELSE 0 END) as sin_public_users
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
WHERE au.email = ANY(ARRAY[
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'sebastian.riosv00@gmail.com',
    'alecaceres6@outlook.com',
    'florenciadelgado061@gmail.com',
    'cotilaco@gmail.com',
    'magameister11@gmail.com',
    'barretoisaacdavid97@gmail.com',
    'melgarejo.lia98@gmail.com',
    'palomaruizdiaz96@gmail.com'
]);

-- 3. VERIFICACIÓN DE ASIGNACIONES (cursos, carreras, instituciones)
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as nombre_completo,
    (SELECT COUNT(*) FROM public.user_institutions WHERE user_id = u.id) as instituciones,
    (SELECT COUNT(*) FROM public.course_enrollments WHERE student_id = u.id) as cursos_inscritos,
    (SELECT COUNT(*) FROM public.career_enrollments WHERE student_id = u.id) as carreras_inscritas,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.user_institutions WHERE user_id = u.id) > 0 
        THEN '✅ Con asignaciones'
        ELSE '⚠️ Sin asignaciones'
    END as tiene_asignaciones
FROM public.users u
WHERE u.email = ANY(ARRAY[
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'sebastian.riosv00@gmail.com',
    'alecaceres6@outlook.com',
    'florenciadelgado061@gmail.com',
    'cotilaco@gmail.com',
    'magameister11@gmail.com',
    'barretoisaacdavid97@gmail.com',
    'melgarejo.lia98@gmail.com',
    'palomaruizdiaz96@gmail.com'
])
ORDER BY u.email;

-- 4. VERIFICACIÓN: ¿Pueden iniciar sesión?
-- (Esto verifica que existan en AMBAS tablas con el MISMO ID)
SELECT 
    '🔐 USUARIOS QUE PUEDEN INICIAR SESIÓN' as verificacion,
    COUNT(*) as total
FROM auth.users au
JOIN public.users pu ON au.id = pu.id AND au.email = pu.email
WHERE au.email = ANY(ARRAY[
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'sebastian.riosv00@gmail.com',
    'alecaceres6@outlook.com',
    'florenciadelgado061@gmail.com',
    'cotilaco@gmail.com',
    'magameister11@gmail.com',
    'barretoisaacdavid97@gmail.com',
    'melgarejo.lia98@gmail.com',
    'palomaruizdiaz96@gmail.com'
]);

-- 5. DETALLE COMPLETO (Para revisar uno por uno)
SELECT 
    au.email,
    'auth.users' as fuente,
    au.id,
    au.created_at,
    au.email_confirmed_at
FROM auth.users au
WHERE au.email = ANY(ARRAY[
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'sebastian.riosv00@gmail.com',
    'alecaceres6@outlook.com',
    'florenciadelgado061@gmail.com',
    'cotilaco@gmail.com',
    'magameister11@gmail.com',
    'barretoisaacdavid97@gmail.com',
    'melgarejo.lia98@gmail.com',
    'palomaruizdiaz96@gmail.com'
])

UNION ALL

SELECT 
    pu.email,
    'public.users' as fuente,
    pu.id,
    pu.created_at,
    NULL as email_confirmed_at
FROM public.users pu
WHERE pu.email = ANY(ARRAY[
    'jaraorregojosesebastian@gmail.com',
    'otihidalgo9@gmail.com',
    'deisypinhanez97@gmail.com',
    'eduatobe96@gmail.com',
    'sebastian.riosv00@gmail.com',
    'alecaceres6@outlook.com',
    'florenciadelgado061@gmail.com',
    'cotilaco@gmail.com',
    'magameister11@gmail.com',
    'barretoisaacdavid97@gmail.com',
    'melgarejo.lia98@gmail.com',
    'palomaruizdiaz96@gmail.com'
])
ORDER BY email, fuente DESC;
