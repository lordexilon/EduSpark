-- check_user_institutions_rls.sql
SELECT * FROM pg_policies WHERE tablename = 'user_institutions';
