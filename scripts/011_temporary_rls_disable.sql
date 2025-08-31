-- Temporary RLS Disable for Users Table
-- This script temporarily disables RLS on the users table to resolve immediate issues
-- WARNING: This reduces security temporarily - only use for testing

-- Temporarily disable RLS on users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- Test that users can now be queried without recursion
DO $$
BEGIN
  RAISE NOTICE 'Testing user table access...';
  
  -- Try to select from users table
  IF EXISTS (
    SELECT 1 FROM public.users LIMIT 1
  ) THEN
    RAISE NOTICE '✅ Users table is now accessible without RLS recursion';
  ELSE
    RAISE NOTICE '⚠️ No users found, but table is accessible';
  END IF;
END;
$$;

-- IMPORTANT: After running the fix script (010_fix_rls_recursion.sql),
-- re-enable RLS with: ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
