-- Row Level Security Policies for DedSecCompute
-- Ensures data security and proper access control
-- Fixed to avoid infinite recursion issues

-- First, drop all existing policies to start fresh
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
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can insert user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Admins can view admin logs" ON public.admin_logs;
DROP POLICY IF EXISTS "System can insert admin logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Users can view their own invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Users can create invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Anyone can view active invite codes for redemption" ON public.invite_codes;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Create a function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function runs with elevated privileges to avoid RLS recursion
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND is_admin = TRUE
  );
END;
$$;

-- Users policies - Fixed to avoid recursion
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin policies using the safe function
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete any user" ON public.users
  FOR DELETE USING (public.is_admin_user(auth.uid()));

-- User sessions policies
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (public.is_admin_user(auth.uid()));

-- Followers policies
CREATE POLICY "Users can view followers" ON public.followers
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can manage their own follows" ON public.followers
  FOR ALL USING (auth.uid() = follower_id);

-- Operations policies
CREATE POLICY "Anyone can view active operations" ON public.operations
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage operations" ON public.operations
  FOR ALL USING (public.is_admin_user(auth.uid()));

-- Task executions policies
CREATE POLICY "Users can view their own tasks" ON public.task_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.task_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.task_executions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks" ON public.task_executions
  FOR SELECT USING (public.is_admin_user(auth.uid()));

-- Network metrics policies
CREATE POLICY "Anyone can view network metrics" ON public.network_metrics
  FOR SELECT USING (TRUE);

CREATE POLICY "System can insert network metrics" ON public.network_metrics
  FOR INSERT WITH CHECK (TRUE);

-- Achievements policies
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL USING (public.is_admin_user(auth.uid()));

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (TRUE);

-- Admin logs policies
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (public.is_admin_user(auth.uid()));

CREATE POLICY "System can insert admin logs" ON public.admin_logs
  FOR INSERT WITH CHECK (TRUE);

-- Invite codes policies
CREATE POLICY "Users can view their own invite codes" ON public.invite_codes
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create invite codes" ON public.invite_codes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can view active invite codes for redemption" ON public.invite_codes
  FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Grant necessary permissions to the is_admin_user function
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO anon;
