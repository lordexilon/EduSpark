-- Migration: Cleanup Legacy RLS and Enforce Centralized Isolation
-- Date: 2026-02-19
-- Description: Drops ALL old/leaky policies and applies strict institutional isolation.

-- =================================================================
-- 1. DROP ALL EXISTING POLICIES (TO START FROM CLEAN STATE)
-- =================================================================

-- Tables: careers, subjects, courses, assessments, flashcards, users

BEGIN;

-- Careers
DROP POLICY IF EXISTS "Institution isolation for careers" ON public.careers;
DROP POLICY IF EXISTS "Public read careers" ON public.careers;
DROP POLICY IF EXISTS "careers_admin_all" ON public.careers;
DROP POLICY IF EXISTS "careers_institution_access" ON public.careers;
DROP POLICY IF EXISTS "coordinators_manage_own_careers" ON public.careers;
DROP POLICY IF EXISTS "everyone_reads_active_careers" ON public.careers;

-- Subjects
DROP POLICY IF EXISTS "Institution isolation for subjects" ON public.subjects;
DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
DROP POLICY IF EXISTS "coordinators_manage_subjects" ON public.subjects;
DROP POLICY IF EXISTS "everyone_reads_subjects" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_institution_access" ON public.subjects;

-- Courses
DROP POLICY IF EXISTS "Institution isolation for courses" ON public.courses;
DROP POLICY IF EXISTS "Public read courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers view own courses" ON public.courses;
DROP POLICY IF EXISTS "admin_campus_coordinator_view_institution_courses" ON public.courses;
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_institution_access" ON public.courses;
DROP POLICY IF EXISTS "courses_owner_rw" ON public.courses;
DROP POLICY IF EXISTS "courses_select_enrolled" ON public.courses;
DROP POLICY IF EXISTS "students_can_view_enrolled_courses" ON public.courses;
DROP POLICY IF EXISTS "supervisor_view_institution_courses" ON public.courses;

-- Assessments
DROP POLICY IF EXISTS "Institution isolation for assessments" ON public.assessments;
DROP POLICY IF EXISTS "admins_all_assessments" ON public.assessments;
DROP POLICY IF EXISTS "students_view_published_assessments" ON public.assessments;
DROP POLICY IF EXISTS "teachers_manage_course_assessments" ON public.assessments;

-- Flashcards
DROP POLICY IF EXISTS "Institution isolation for flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Admins can view all flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Students can view flashcards in enrolled courses" ON public.flashcards;
DROP POLICY IF EXISTS "Teachers can manage their own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Teachers can view flashcards in their courses" ON public.flashcards;

-- Users (Profiles)
DROP POLICY IF EXISTS "Institution isolation for profiles" ON public.users;
DROP POLICY IF EXISTS "Admin Global sees all" ON public.users;
DROP POLICY IF EXISTS "Campus Admin/Supervisor sees institution" ON public.users;
DROP POLICY IF EXISTS "Authenticated users see all profiles" ON public.users;
DROP POLICY IF EXISTS "Public profiles" ON public.users;
DROP POLICY IF EXISTS "Users see own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;

-- =================================================================
-- 2. RE-APPLY CENTRALIZED ISOLATION POLICIES
-- =================================================================

-- A. Careers
CREATE POLICY "Strict institution isolation for careers" ON public.careers
    FOR SELECT USING ( public.check_user_access_to_institution(institution_id) );
    
CREATE POLICY "Admins manage careers" ON public.careers
    FOR ALL USING ( 
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'admin'
        )
    );

-- B. Subjects
CREATE POLICY "Strict institution isolation for subjects" ON public.subjects
    FOR SELECT USING ( 
        EXISTS (
            SELECT 1 FROM public.careers c 
            WHERE c.id = subjects.career_id 
            AND public.check_user_access_to_institution(c.institution_id)
        )
    );

CREATE POLICY "Admins manage subjects" ON public.subjects
    FOR ALL USING ( 
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'admin'
        )
    );

-- C. Courses (Using the FIXED recursive check)
CREATE POLICY "Strict institution isolation for courses" ON public.courses
    FOR SELECT USING (
        teacher_id = auth.uid()
        OR (institution_id IS NOT NULL AND public.check_user_access_to_institution(institution_id))
        OR public.check_is_enrolled_in_course(id) -- Security definer broken loop
    );

CREATE POLICY "Admins manage courses" ON public.courses
    FOR ALL USING ( 
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name = 'admin'
        )
    );

-- D. Assessments
CREATE POLICY "Strict institution isolation for assessments" ON public.assessments
    FOR ALL USING (
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

-- E. Flashcards
CREATE POLICY "Strict institution isolation for flashcards" ON public.flashcards
    FOR ALL USING (
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

-- F. Users (Profiles)
CREATE POLICY "Strict institution isolation for profiles" ON public.users
    FOR SELECT USING ( public.check_users_share_institution(id) );

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING ( auth.uid() = id );

COMMIT;
