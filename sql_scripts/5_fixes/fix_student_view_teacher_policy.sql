-- Policy to allow students to view teachers of their courses
DROP POLICY IF EXISTS "Students can view teachers of their courses" ON users;

CREATE POLICY "Students can view teachers of their courses"
ON users
FOR SELECT
USING (
  auth.uid() IN (
    SELECT ce.student_id
    FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id
    WHERE c.teacher_id = users.id
    AND ce.status = 'active'
  )
);
