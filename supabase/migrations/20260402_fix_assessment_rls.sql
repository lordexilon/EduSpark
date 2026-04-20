-- Fix RLS policy on assessments to allow UPDATE for teachers/admins
-- The previous 'Manage assessments' policy used 'FOR ALL WITH CHECK', which omitted 'USING'.
-- Without a 'USING' clause, UPDATE statements return 0 rows for the RETURNING clause (like Supabase's .select().single())

BEGIN;

DROP POLICY IF EXISTS "Manage assessments" ON public.assessments;

CREATE POLICY "Manage assessments" ON public.assessments
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.users u ON u.id = auth.uid()
            JOIN public.roles r ON u.role_id = r.id
            WHERE c.id = assessments.course_id
            AND (
                r.name = 'admin'
                OR c.teacher_id = auth.uid()
                OR (
                    public.check_user_access_to_institution(c.institution_id)
                    AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.users u ON u.id = auth.uid()
            JOIN public.roles r ON u.role_id = r.id
            WHERE c.id = assessments.course_id
            AND (
                r.name = 'admin'
                OR c.teacher_id = auth.uid()
                OR (
                    public.check_user_access_to_institution(c.institution_id)
                    AND r.name IN ('admin-campus', 'supervisor', 'coordinator')
                )
            )
        )
    );

COMMIT;
