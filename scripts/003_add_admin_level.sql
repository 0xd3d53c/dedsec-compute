-- ============================================================================
-- DEDSECCOMPUTE - ADD ADMIN LEVEL COLUMN
-- ============================================================================
-- This script adds admin_level column to users table for super admin functionality
-- ============================================================================

-- Add admin_level column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS admin_level VARCHAR(20) DEFAULT 'user' 
CHECK (admin_level IN ('user', 'viewer', 'moderator', 'admin', 'super_admin'));

-- Update existing admin users to have admin level
UPDATE public.users 
SET admin_level = 'admin' 
WHERE is_admin = true AND admin_level = 'user';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_admin_level ON public.users(admin_level);

-- Add comment for documentation
COMMENT ON COLUMN public.users.admin_level IS 'Admin privilege level: user, viewer, moderator, admin, super_admin';
