-- Test script to verify user creation works properly
-- Run this after applying the fix to ensure everything works

-- Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Check if the users table has the correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Test the invite code generation function
SELECT public.generate_invite_code() as test_invite_code;

-- Check if there are any existing users (for reference)
SELECT 
  id,
  username,
  display_name,
  email,
  invite_code,
  is_admin,
  is_active,
  created_at
FROM public.users 
LIMIT 5;

-- Verify RLS is enabled on the users table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';
