-- =====================================================
-- DIAGNÓSTICO: Usuario no ve curso asignado
-- Usuario: melgarejo.lia98@gmail.com
-- Problema: Curso asignado pero no visible en /teacher/students
-- =====================================================

-- 1. INFORMACIÓN BÁSICA DEL USUARIO
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as rol,
    u.is_active,
    u.email_verified
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'melgarejo.lia98@gmail.com';

-- 2. INSTITUCIONES ASIGNADAS
SELECT 
    ui.user_id,
    i.id as institution_id,
    i.name as institution_name,
    ui.is_primary,
    ui.position
FROM public.user_institutions ui
JOIN public.institutions i ON ui.institution_id = i.id
WHERE ui.user_id IN (
    SELECT id FROM public.users WHERE email = 'melgarejo.lia98@gmail.com'
);

-- 3. CARRERAS ASIGNADAS
SELECT 
    ce.student_id as user_id,
    c.id as career_id,
    c.name as career_name,
    ce.status,
    ce.enrollment_date
FROM public.career_enrollments ce
JOIN public.careers c ON ce.career_id = c.id
WHERE ce.student_id IN (
    SELECT id FROM public.users WHERE email = 'melgarejo.lia98@gmail.com'
);

-- 4. CURSOS ASIGNADOS (Como Estudiante)
SELECT 
    ce.student_id as user_id,
    co.id as course_id,
    co.title as course_title,
    co.teacher_id,
    t.first_name || ' ' || t.last_name as teacher_name,
    ce.status,
    ce.enrolled_at
FROM public.course_enrollments ce
JOIN public.courses co ON ce.course_id = co.id
LEFT JOIN public.users t ON co.teacher_id = t.id
WHERE ce.student_id IN (
    SELECT id FROM public.users WHERE email = 'melgarejo.lia98@gmail.com'
);

-- 5. CURSOS CREADOS (Como Profesor) - SI ES TEACHER
SELECT 
    co.id as course_id,
    co.title as course_title,
    co.teacher_id,
    co.institution_id,
    i.name as institution_name,
    co.is_published,
    co.created_at
FROM public.courses co
LEFT JOIN public.institutions i ON co.institution_id = i.id
WHERE co.teacher_id IN (
    SELECT id FROM public.users WHERE email = 'melgarejo.lia98@gmail.com'
);

-- 6. VERIFICAR PERMISOS RLS - ¿Puede ver cursos?
-- Esta consulta simula lo que vería el usuario
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = (SELECT id::text FROM public.users WHERE email = 'melgarejo.lia98@gmail.com');

SELECT 
    co.id as course_id,
    co.title as course_title,
    co.teacher_id,
    COUNT(ce.student_id) as total_students
FROM public.courses co
LEFT JOIN public.course_enrollments ce ON co.id = ce.course_id
WHERE co.teacher_id = (SELECT id FROM public.users WHERE email = 'melgarejo.lia98@gmail.com')
GROUP BY co.id, co.title, co.teacher_id;

RESET ROLE;

-- 7. VERIFICAR SI HAY ESTUDIANTES EN SUS CURSOS
SELECT 
    co.id as course_id,
    co.title as course_title,
    COUNT(DISTINCT ce.student_id) as total_students,
    array_agg(DISTINCT s.email) as student_emails
FROM public.courses co
LEFT JOIN public.course_enrollments ce ON co.id = ce.course_id
LEFT JOIN public.users s ON ce.student_id = s.id
WHERE co.teacher_id IN (
    SELECT id FROM public.users WHERE email = 'melgarejo.lia98@gmail.com'
)
GROUP BY co.id, co.title;

-- 8. VERIFICAR RELACIONES ENTRE CURSO Y CARRERA/MATERIA
SELECT 
    co.id as course_id,
    co.title as course_title,
    co.subject_id,
    s.name as subject_name,
    s.career_id,
    ca.name as career_name
FROM public.courses co
LEFT JOIN public.subjects s ON co.subject_id = s.id
LEFT JOIN public.careers ca ON s.career_id = ca.id
WHERE co.teacher_id IN (
    SELECT id FROM public.users WHERE email = 'melgarejo.lia98@gmail.com'
);

-- 9. RESUMEN EJECUTIVO
SELECT 
    'Usuario' as seccion,
    u.email,
    r.name as rol,
    u.is_active as activo,
    (SELECT COUNT(*) FROM public.courses WHERE teacher_id = u.id) as cursos_como_profesor,
    (SELECT COUNT(*) FROM public.course_enrollments WHERE student_id = u.id) as cursos_como_estudiante
FROM public.users u
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE u.email = 'melgarejo.lia98@gmail.com';

-- 10. VERIFICAR POLÍTICAS RLS DE LA TABLA COURSES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'courses';
