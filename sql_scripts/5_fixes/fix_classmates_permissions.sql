-- Fix permissions to allow students to see and message their classmates

-- 1. Create a secure helper function to check if two users are classmates
CREATE OR REPLACE FUNCTION public.is_classmate(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Returns true if the current user and the target user share at least one active course
  RETURN EXISTS (
    SELECT 1
    FROM course_enrollments ce1
    JOIN course_enrollments ce2 ON ce1.course_id = ce2.course_id
    WHERE ce1.student_id = auth.uid()
    AND ce2.student_id = target_user_id
    AND ce1.status = 'active'
    AND ce2.status = 'active'
    AND ce1.course_id = ce2.course_id
  );
END;
$$;

-- 2. Update the 'users' table policy to include classmates
-- We drop the previous one to replace it with a combined one (Teachers OR Classmates)
DROP POLICY IF EXISTS "Students can view teachers of their courses" ON users;
DROP POLICY IF EXISTS "Students can view related users (teachers and classmates)" ON users;

CREATE POLICY "Students can view related users (teachers and classmates)"
ON users
FOR SELECT
USING (
  -- Allow if the user is a student of this teacher
  is_student_of_teacher(id)
  OR
  -- Allow if the user is a classmate
  is_classmate(id)
  OR
  -- Always allow viewing yourself
  auth.uid() = id
);

-- 3. Update 'course_enrollments' policy to allow seeing who else is in my courses
DROP POLICY IF EXISTS "Students can view classmates enrollments" ON course_enrollments;

CREATE POLICY "Students can view classmates enrollments"
ON course_enrollments
FOR SELECT
USING (
  course_id IN (
    SELECT course_id 
    FROM course_enrollments 
    WHERE student_id = auth.uid() 
    AND status = 'active'
  )
);
