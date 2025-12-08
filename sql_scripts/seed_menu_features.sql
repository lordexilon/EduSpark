-- Seed data for menu_features table
-- This script populates the initial feature flags for the dynamic menu system.

INSERT INTO public.menu_features (key, enabled, allowed_roles)
VALUES
    ('student_sessions', true, NULL),
    ('ai_tutor', true, NULL),
    ('flashcards', true, NULL),
    ('assignments', true, NULL),
    ('grades', true, NULL),
    ('announcements', true, NULL),
    ('forums', true, NULL),
    ('messaging', true, NULL),
    ('admin_reports', true, '{admin,admin-campus}'),
    ('menu_management', true, '{admin}')
ON CONFLICT (key) DO NOTHING;
