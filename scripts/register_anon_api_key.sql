INSERT INTO public.api_keys (institution_id, name, key_prefix, key_hash, scopes, status)
VALUES (
    1,
    'Langflow Local Integration Key (Supabase Anon Key)',
    'eyJhbGciOiJI',
    'bf1725a8f98bea37e88618702e725ba84bd8acdb2647c5e0ed638bfd685791cf',
    '{"tutor:chat"}',
    'active'
) ON CONFLICT (key_hash) DO NOTHING;
