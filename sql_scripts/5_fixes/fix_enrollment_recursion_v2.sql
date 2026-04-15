-- Fix for infinite recursion in course_enrollments policy
-- We use a SECURITY DEFINER function to fetch the user's courses without triggering RLS recursion

-- 1. Create the helper function to get my course IDs securely
CREATE OR REPLACE FUNCTION public.get_my_enrolled_course_ids()
RETURNS SETOF bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT course_id 
  FROM course_enrollments 
  WHERE student_id = auth.uid() 
  AND status = 'active';
$$;

-- 2. Drop the problematic policy
DROP POLICY IF EXISTS "Students can view classmates enrollments" ON course_enrollments;

-- 3. Re-create the policy using the secure function
CREATE POLICY "Students can view classmates enrollments"
ON course_enrollments
FOR SELECT
USING (
  -- Allow if the enrollment belongs to a course I am enrolled in
  course_id IN (SELECT get_my_enrolled_course_ids())
);

-- 4. Ensure admins and teachers have access (prevent locking them out)
-- (Assuming existing policies cover them, but adding a safety check just in case)
DROP POLICY IF EXISTS "Admins and Teachers can view all enrollments" ON course_enrollments;
CREATE POLICY "Admins and Teachers can view all enrollments"
ON course_enrollments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role_id IN (2, 3, 4) -- Teacher, Admin, Admin-Campus
  )
);
