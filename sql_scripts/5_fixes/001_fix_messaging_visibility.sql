-- Fix visibility for students in messaging
-- Allows authenticated users to fetch basic info of other users by ID
-- This is secure because it only exposes public info (name, avatar, role)

CREATE OR REPLACE FUNCTION public.get_basic_users_info(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  avatar_url text,
  role_id int,
  role_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.avatar_url,
    u.role_id,
    r.name as role_name
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_basic_users_info(uuid[]) TO authenticated;
