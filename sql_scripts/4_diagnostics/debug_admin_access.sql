-- Verificar si la función is_admin() existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_admin';

-- Verificar el rol del usuario actual
SELECT 
    u.id,
    u.email,
    r.name as role_name,
    ui.institution_id
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN user_institutions ui ON ui.user_id = u.id
WHERE u.id = auth.uid();

-- Probar acceso directo a processed_documents (sin RLS)
SET session_replication_role = 'replica'; -- Deshabilita RLS temporalmente
SELECT COUNT(*) as total_documents FROM processed_documents;
SET session_replication_role = 'origin'; -- Rehabilita RLS

-- Probar acceso con RLS activo
SELECT COUNT(*) as accessible_documents FROM processed_documents;
