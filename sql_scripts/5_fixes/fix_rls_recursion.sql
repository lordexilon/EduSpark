-- Fix for infinite recursion in RLS policies
-- We use a SECURITY DEFINER function to check the relationship without triggering RLS recursion

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.is_student_of_teacher(target_teacher_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user (student) is enrolled in a course taught by the target teacher
  RETURN EXISTS (
    SELECT 1
    FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id
    WHERE ce.student_id = auth.uid()
    AND c.teacher_id = target_teacher_id
    AND ce.status = 'active'
  );
END;
$$;

-- 2. Drop the problematic policy
DROP POLICY IF EXISTS "Students can view teachers of their courses" ON users;

-- 3. Re-create the policy using the secure function
CREATE POLICY "Students can view teachers of their courses"
ON users
FOR SELECT
USING (
  -- Allow if the user is a student of this teacher
  is_student_of_teacher(id)
);
