-- Migration: Enforce Institution Data Isolation
-- Date: 2026-02-19
-- Description: Restricts access to careers, subjects, assessments, flashcards, and profiles based on institution_id.

-- =================================================================
-- 1. Helper Functions (Optimized for RLS)
-- =================================================================

-- Function to check if current user has access to a specific institution
-- Returns TRUE if user is Global Admin OR belongs to the institution
CREATE OR REPLACE FUNCTION public.check_user_access_to_institution(target_institution_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE -- Stable for better performance in RLS
AS $$
BEGIN
    -- 1. Global Admin checks (role 'admin') - Bypass
    -- Optimization: Check role first (cached by Supabase auth usually, but here we query)
    IF EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check if user belongs to the institution
    IF EXISTS (
        SELECT 1 FROM public.user_institutions
        WHERE user_id = auth.uid() AND institution_id = target_institution_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Function to check if current user shares ANY institution with a target user (for profile visibility)
CREATE OR REPLACE FUNCTION public.check_users_share_institution(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
     -- 1. Self access
    IF auth.uid() = target_user_id THEN
        RETURN TRUE;
    END IF;

    -- 2. Global Admin checks
    IF EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Check for shared institution
    IF EXISTS (
        SELECT 1
        FROM public.user_institutions ui_current
        JOIN public.user_institutions ui_target ON ui_current.institution_id = ui_target.institution_id
        WHERE ui_current.user_id = auth.uid()
        AND ui_target.user_id = target_user_id
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- =================================================================
-- 2. RLS Policies for Academic Structure
-- =================================================================

-- A. Careers (Carreras)
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read careers" ON public.careers;

CREATE POLICY "Institution isolation for careers" ON public.careers
    FOR SELECT
    USING (
        public.check_user_access_to_institution(institution_id)
    );

-- B. Subjects (Materias)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;

CREATE POLICY "Institution isolation for subjects" ON public.subjects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.careers c
            WHERE c.id = subjects.career_id
            AND public.check_user_access_to_institution(c.institution_id)
        )
    );

-- C. Courses (Cursos - Gestión Docente)
-- Note: Teacher courses usually have institution_id directly
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers view own courses" ON public.courses;

CREATE POLICY "Institution isolation for courses" ON public.courses
    FOR SELECT
    USING (
        -- User sees course if:
        -- 1. It belongs to their institution
        (institution_id IS NOT NULL AND public.check_user_access_to_institution(institution_id))
        OR
        -- 2. Or they are the teacher (fallback if institution_id is missing)
        (teacher_id = auth.uid())
        OR
        -- 3. Or they are enrolled (Students)
        EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            WHERE ce.course_id = courses.id
            AND ce.student_id = auth.uid()
        )
    );

-- =================================================================
-- 3. RLS Policies for Assessments & Content
-- =================================================================

-- A. Assessments (Quizzes/Exams)
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution isolation for assessments" ON public.assessments
    FOR ALL
    USING (
        -- Visible via Course linkage
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = assessments.course_id
            AND (
                -- Access to course implies access to assessment
                public.check_user_access_to_institution(c.institution_id)
                OR c.teacher_id = auth.uid()
                OR EXISTS (
                     SELECT 1 FROM public.course_enrollments ce
                     WHERE ce.course_id = c.id
                     AND ce.student_id = auth.uid()
                )
            )
        )
    );

-- B. Flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution isolation for flashcards" ON public.flashcards
    FOR ALL
    USING (
        -- Visible via Course linkage
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = flashcards.course_id
            AND (
                public.check_user_access_to_institution(c.institution_id)
                OR c.teacher_id = auth.uid()
                OR EXISTS (
                     SELECT 1 FROM public.course_enrollments ce
                     WHERE ce.course_id = c.id
                     AND ce.student_id = auth.uid()
                )
            )
        )
    );

-- =================================================================
-- 4. RLS Policies for Users (Profiles)
-- =================================================================

-- CAUTION: This is sensitive. We must ensure users can always see themselves.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop generic "Public profiles" if it exists
DROP POLICY IF EXISTS "Public profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated users see all profiles" ON public.users;

CREATE POLICY "Institution isolation for profiles" ON public.users
    FOR SELECT
    USING (
        public.check_users_share_institution(id)
    );

-- Grant update to self
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE
    USING ( auth.uid() = id );
