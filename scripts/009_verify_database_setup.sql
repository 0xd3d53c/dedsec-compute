-- Database Setup Verification Script
-- Run this to check if your database is properly configured

-- 1. Check if the users table exists and has correct structure
SELECT 
  'USERS TABLE STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if the trigger exists
SELECT 
  'TRIGGER CHECK' as check_type,
  trigger_name,
  event_manipulation,
  action_statement,
  CASE 
    WHEN trigger_name = 'on_auth_user_created' THEN '✅ TRIGGER EXISTS'
    ELSE '❌ TRIGGER MISSING'
  END as status
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Check if the function exists
SELECT 
  'FUNCTION CHECK' as check_type,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'handle_new_user' THEN '✅ FUNCTION EXISTS'
    ELSE '❌ FUNCTION MISSING'
  END as status
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 4. Check if RLS is enabled
SELECT 
  'RLS CHECK' as check_type,
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as status
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 5. Check if there are any existing users
SELECT 
  'EXISTING USERS' as check_type,
  COUNT(*) as user_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ USERS EXIST'
    ELSE '⚠️ NO USERS YET'
  END as status
FROM public.users;

-- 6. Test the invite code generation function
SELECT 
  'INVITE CODE TEST' as check_type,
  public.generate_invite_code() as test_invite_code,
  '✅ FUNCTION WORKS' as status;

-- 7. Check for any conflicting triggers or functions
SELECT 
  'CONFLICT CHECK' as check_type,
  'Checking for conflicts...' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO CONFLICTS'
    ELSE '⚠️ POTENTIAL CONFLICTS FOUND'
  END as status
FROM (
  SELECT trigger_name FROM information_schema.triggers 
  WHERE trigger_name LIKE '%user%' AND table_schema = 'auth'
  UNION
  SELECT routine_name FROM information_schema.routines 
  WHERE routine_name LIKE '%user%' AND routine_schema = 'public'
) as all_user_related;

-- 8. Summary
SELECT 
  'SUMMARY' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public')
    AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
    AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public')
    THEN '✅ DATABASE SETUP LOOKS GOOD'
    ELSE '❌ DATABASE SETUP HAS ISSUES'
  END as overall_status;
