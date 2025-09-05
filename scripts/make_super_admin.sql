-- ============================================================================
-- MAKE YOURSELF SUPER ADMIN
-- ============================================================================
-- Run this script to make yourself a super admin
-- Replace 'YOUR_USERNAME' with your actual username
-- ============================================================================

-- First, run the admin level migration if you haven't already
-- (This is included in 003_add_admin_level.sql)

-- Make yourself a super admin
-- Replace 'YOUR_USERNAME' with your actual username from the users table
UPDATE public.users 
SET 
  is_admin = true,
  admin_level = 'super_admin',
  updated_at = NOW()
WHERE username = 'admin1';

-- Verify the change
SELECT 
  id,
  username,
  email,
  is_admin,
  admin_level,
  created_at,
  updated_at
FROM public.users 
WHERE username = 'admin1';

-- Alternative: If you know your user ID, you can use this instead:
-- UPDATE public.users 
-- SET 
--   is_admin = true,
--   admin_level = 'super_admin',
--   updated_at = NOW()
-- WHERE id = 'YOUR_USER_ID_HERE';
