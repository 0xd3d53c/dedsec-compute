-- Fix RLS Infinite Recursion Issues
-- This script resolves the "infinite recursion detected in policy" error

-- First, drop all existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

DROP POLICY IF EXISTS "Users can view followers" ON public.followers;
DROP POLICY IF EXISTS "Users can manage their own follows" ON public.followers;

DROP POLICY IF EXISTS "Anyone can view active operations" ON public.operations;
DROP POLICY IF EXISTS "Admins can manage operations" ON public.operations;

DROP POLICY IF EXISTS "Users can view their own tasks" ON public.task_executions;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.task_executions;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.task_executions;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.task_executions;

DROP POLICY IF EXISTS "Anyone can view network metrics" ON public.network_metrics;
DROP POLICY IF EXISTS "System can insert network metrics" ON public.network_metrics;

DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

-- Now create proper RLS policies that don't cause recursion

-- Users table policies (simplified to prevent recursion)
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow system functions to work (for triggers)
CREATE POLICY "users_system_access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- User sessions policies
CREATE POLICY "user_sessions_select_own" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_sessions_insert_own" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sessions_update_own" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_sessions_delete_own" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Followers policies
CREATE POLICY "followers_select_own" ON public.followers
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "followers_insert_own" ON public.followers
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "followers_delete_own" ON public.followers
  FOR DELETE USING (auth.uid() = follower_id);

-- Operations policies (public read, restricted write)
CREATE POLICY "operations_select_public" ON public.operations
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "operations_insert_admin" ON public.operations
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "operations_update_admin" ON public.operations
  FOR UPDATE USING (auth.role() = 'service_role');

-- Task executions policies
CREATE POLICY "task_executions_select_own" ON public.task_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "task_executions_insert_own" ON public.task_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "task_executions_update_own" ON public.task_executions
  FOR UPDATE USING (auth.uid() = user_id);

-- Network metrics policies (public read, system write)
CREATE POLICY "network_metrics_select_public" ON public.network_metrics
  FOR SELECT USING (TRUE);

CREATE POLICY "network_metrics_insert_system" ON public.network_metrics
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Achievements policies (public read, admin write)
CREATE POLICY "achievements_select_public" ON public.achievements
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "achievements_insert_admin" ON public.achievements
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "achievements_update_admin" ON public.achievements
  FOR UPDATE USING (auth.role() = 'service_role');

-- Admin logs policies (admin only)
CREATE POLICY "admin_logs_select_admin" ON public.admin_logs
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "admin_logs_insert_system" ON public.admin_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Invite codes policies (public read, system write)
CREATE POLICY "invite_codes_select_public" ON public.invite_codes
  FOR SELECT USING (TRUE);

CREATE POLICY "invite_codes_insert_system" ON public.invite_codes
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- User achievements policies
CREATE POLICY "user_achievements_select_own" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_insert_own" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test that the recursion is fixed
DO $$
BEGIN
  -- Try to select from users table (should not cause recursion)
  IF EXISTS (
    SELECT 1 FROM public.users LIMIT 1
  ) THEN
    RAISE NOTICE '✅ RLS policies working without recursion';
  ELSE
    RAISE NOTICE '⚠️ No users found, but no recursion error either';
  END IF;
END;
$$;
