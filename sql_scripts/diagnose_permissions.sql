-- diagnose_permissions.sql
-- Check current user role and existing policies
-- Run this in Supabase SQL Editor

-- 1. Check the specific user's role in the DB
SELECT u.id, u.email, r.name as role_name, u.role_id
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'albertovillalba@gmail.com';

-- 2. List all policies on user_institutions to see if duplicates or old ones exist
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_institutions';

-- 3. List all policies on users table (critical for recursion)
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- 4. Check if the helper function exists and works
SELECT public.get_auth_user_institutions();
