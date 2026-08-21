GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS identity_document VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS identity_document_type VARCHAR(20);
