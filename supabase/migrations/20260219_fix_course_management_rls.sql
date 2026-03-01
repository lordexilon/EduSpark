-- Migration: Correct RLS Management Permissions and Security Hardening
-- Date: 2026-02-19
-- Description: Fixes teacher/campus admin management permissions while restricting students to SELECT only.

BEGIN;

-- =================================================================
-- 1. COURSES - Allow management for Teachers and Campus Admins
-- =================================================================
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
DROP POLICY IF EXISTS "Manage courses" ON public.courses; -- Cleanup previously proposed

CREATE POLICY "Manage courses" ON public.courses
    FOR ALL USING (
        -- Global Admin
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'admin'
        )
        OR 
        -- Owner (Teacher)
        teacher_id = auth.uid()
        OR
        -- Institutional Manager (Campus Admin, Supervisor, etc.)
        (
            institution_id IS NOT NULL 
            AND public.check_user_access_to_institution(institution_id)
            AND EXISTS (
                SELECT 1 FROM public.users u
                JOIN public.roles r ON u.role_id = r.id
                WHERE u.id = auth.uid() 
                AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
            )
        )
    );

-- =================================================================
-- 2. ASSESSMENTS - Hardening (Restrict Students to SELECT)
-- =================================================================
DROP POLICY IF EXISTS "Strict institution isolation for assessments" ON public.assessments;

-- Reading
CREATE POLICY "View assessments" ON public.assessments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = assessments.course_id
            AND (
                public.check_user_access_to_institution(c.institution_id)
                OR c.teacher_id = auth.uid()
                OR public.check_is_enrolled_in_course(c.id)
            )
        )
    );

-- Managing (Create, Update, Delete)
CREATE POLICY "Manage assessments" ON public.assessments
    FOR ALL WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.users u ON u.id = auth.uid()
            JOIN public.roles r ON u.role_id = r.id
            WHERE c.id = assessments.course_id
            AND (
                -- Global Admin
                r.name = 'admin'
                OR
                -- Teacher of the course
                c.teacher_id = auth.uid()
                OR
                -- Manager of the institution
                (
                    public.check_user_access_to_institution(c.institution_id)
                    AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
                )
            )
        )
    );

-- =================================================================
-- 3. FLASHCARDS - Hardening (Restrict Students to SELECT)
-- =================================================================
DROP POLICY IF EXISTS "Strict institution isolation for flashcards" ON public.flashcards;

-- Reading
CREATE POLICY "View flashcards" ON public.flashcards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = flashcards.course_id
            AND (
                public.check_user_access_to_institution(c.institution_id)
                OR c.teacher_id = auth.uid()
                OR public.check_is_enrolled_in_course(c.id)
            )
        )
    );

-- Managing (Create, Update, Delete)
CREATE POLICY "Manage flashcards" ON public.flashcards
    FOR ALL WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.users u ON u.id = auth.uid()
            JOIN public.roles r ON u.role_id = r.id
            WHERE c.id = flashcards.course_id
            AND (
                -- Global Admin
                r.name = 'admin'
                OR
                -- Teacher of the course
                c.teacher_id = auth.uid()
                OR
                -- Manager of the institution
                (
                    public.check_user_access_to_institution(c.institution_id)
                    AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
                )
            )
        )
    );

-- =================================================================
-- 4. CAREERS & SUBJECTS - Allow Campus Admins to manage
-- =================================================================
DROP POLICY IF EXISTS "Admins manage careers" ON public.careers;
CREATE POLICY "Manage careers" ON public.careers
    FOR ALL USING ( 
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('admin', 'admin-campus', 'coordinator')
        )
        AND (institution_id IS NULL OR public.check_user_access_to_institution(institution_id))
    );

DROP POLICY IF EXISTS "Admins manage subjects" ON public.subjects;
CREATE POLICY "Manage subjects" ON public.subjects
    FOR ALL USING ( 
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('admin', 'admin-campus', 'coordinator')
        )
        AND EXISTS (
            SELECT 1 FROM public.careers c 
            WHERE c.id = subjects.career_id 
            AND public.check_user_access_to_institution(c.institution_id)
        )
    );

COMMIT;
