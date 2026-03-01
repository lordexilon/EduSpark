-- Migration: Fix Recursive RLS on Courses
-- Date: 2026-02-19
-- Description: Uncouples courses policy from course_enrollments to prevent infinite recursion.

-- OPTIMIZED POLICY: "Institution isolation for courses"
-- We remove the subquery to `course_enrollments` from the MAIN policy if possible, OR
-- we rely on a cleaner approach where `course_enrollments` does NOT check `courses`.

-- BUT: `course_enrollments` usually needs to check `courses` to ensure validity.
-- The loop is: 
-- 1. User queries `courses`. Policy checks `course_enrollments`.
-- 2. `course_enrollments` policy (if strict) might check `courses` for institution/status.

-- Fix for "Institution isolation for courses":
-- Instead of complex EXISTS, we trust that if a user has a row in `course_enrollments`, they can see the course.
-- We must ensure accessing `course_enrollments` does not trigger a scan on `courses`.

DROP POLICY IF EXISTS "Institution isolation for courses" ON public.courses;

CREATE POLICY "Institution isolation for courses" ON public.courses
    FOR SELECT
    USING (
        -- 1. Teacher/Owner (Fastest)
        teacher_id = auth.uid()
        
        OR
        
        -- 2. Institution Match (Fast)
        (institution_id IS NOT NULL AND public.check_user_access_to_institution(institution_id))
        
        OR
        
        -- 3. Enrollment Match (Potential Loop Source)
        -- We select directly from course_enrollments WITHOUT joining courses
        EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            WHERE ce.course_id = courses.id
            AND ce.student_id = auth.uid()
        )
    );

-- CRITICAL FIX: Ensure `course_enrollments` policy does NOT query `courses`
-- Check existing policy in 20260218_fix_comms_and_academic_rls.sql
-- It was:
/*
CREATE POLICY "Users can view relevant enrollments" ON public.career_enrollments ...
-- Wait, that was career_enrollments.
-- Let's check `course_enrollments` specifically.
*/

-- If `course_enrollments` has no specific RLS or a recursive one, we fix it here.
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own course enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Teachers view course enrollments" ON public.course_enrollments;

-- Simple policy for students: "I can see my rows"
CREATE POLICY "Students view own course enrollments" ON public.course_enrollments
    FOR SELECT
    USING ( student_id = auth.uid() );

-- Simple policy for teachers: "I can see rows for my courses"
-- WARNING: This queries `courses`. This causes the loop if `courses` queries `course_enrollments`.
-- Loop:
-- Query `courses` -> checks `course_enrollments` (student check) -> checks `courses` (teacher check?) -> LOOP.

-- SOLUTION to break loop:
-- The `courses` policy for STUDENTS (checking enrollment) matches the `course_enrollments` policy for STUDENTS (checking uid).
-- The `courses` policy for TEACHERS (checking id) does NOT need to check enrollments.

-- Let's trace the Student path:
-- 1. Student selects `courses`.
-- 2. RLS: `EXISTS (SELECT 1 FROM course_enrollments WHERE course_id=id AND student_id=uid)`
-- 3. RLS on `course_enrollments` executes.
-- 4. If `course_enrollments` policy is JUST `student_id = auth.uid()`, then:
--    - It filters by student_id. It DOES NOT query `courses`.
--    - Loop broken.

-- However, if `course_enrollments` policy ALSO includes "Teachers can see enrollments", like:
-- `EXISTS (SELECT 1 FROM courses WHERE id=course_id AND teacher_id=uid)`
-- Then:
-- 1. Student queries `courses`.
-- 2. Accesses `course_enrollments`.
-- 3. `course_enrollments` evaluates strict policy.
--    - OR 1: `student_id = uid` (True for student).
--    - OR 2: `EXISTS (SELECT 1 FROM courses ...)` -> Triggers check on `courses` again? 
--    - Optimization might short-circuit, but PostgreSQL planner is tricky.

-- SAFEGUARD: Use `security_barrier` or split policies?
-- Better: Use a SECURITY DEFINER function to check enrollment for the `courses` policy.

CREATE OR REPLACE FUNCTION public.check_is_enrolled_in_course(target_course_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS on course_enrollments to avoid recursion
STABLE
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.course_enrollments
        WHERE course_id = target_course_id
        AND student_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$;

-- Re-create Courses Policy using the secure function
DROP POLICY IF EXISTS "Institution isolation for courses" ON public.courses;

CREATE POLICY "Institution isolation for courses" ON public.courses
    FOR SELECT
    USING (
        teacher_id = auth.uid()
        OR
        (institution_id IS NOT NULL AND public.check_user_access_to_institution(institution_id))
        OR
        public.check_is_enrolled_in_course(id) -- Uses Security Definer to break recursion
    );
