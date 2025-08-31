-- Row Level Security Policies for DedSecCompute
-- Ensures data security and proper access control
-- Updated to match the actual database schema

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

-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- User sessions policies
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Followers policies
CREATE POLICY "Users can view followers" ON public.followers
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can manage their own follows" ON public.followers
  FOR ALL USING (auth.uid() = follower_id);

-- Operations policies
CREATE POLICY "Anyone can view active operations" ON public.operations
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage operations" ON public.operations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Task executions policies
CREATE POLICY "Users can view their own tasks" ON public.task_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.task_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.task_executions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tasks" ON public.task_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Network metrics policies
CREATE POLICY "Anyone can view network metrics" ON public.network_metrics
  FOR SELECT USING (TRUE);

CREATE POLICY "System can insert network metrics" ON public.network_metrics
  FOR INSERT WITH CHECK (TRUE);

-- Achievements policies
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (TRUE);

-- Admin logs policies
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "System can insert admin logs" ON public.admin_logs
  FOR INSERT WITH CHECK (TRUE);

-- Invite codes policies
CREATE POLICY "Users can view their own invite codes" ON public.invite_codes
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create invite codes" ON public.invite_codes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can view active invite codes for redemption" ON public.invite_codes
  FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Drop any conflicting policies that might exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own devices" ON public.devices;
DROP POLICY IF EXISTS "Users can manage own devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can view all devices" ON public.devices;
DROP POLICY IF EXISTS "Missions are viewable by everyone" ON public.missions;
DROP POLICY IF EXISTS "Admins can manage missions" ON public.missions;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.task_assignments;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.task_assignments;
DROP POLICY IF EXISTS "System can insert tasks" ON public.task_assignments;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.contribution_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.contribution_sessions;
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.user_follows;
DROP POLICY IF EXISTS "Users can manage own follows" ON public.user_follows;
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements;
DROP POLICY IF EXISTS "User achievements are viewable by everyone" ON public.user_achievements;
DROP POLICY IF EXISTS "System can award achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view own invites" ON public.invites;
DROP POLICY IF EXISTS "Users can create invites" ON public.invites;
DROP POLICY IF EXISTS "Anyone can view active invites" ON public.invites;
DROP POLICY IF EXISTS "Network stats are viewable by everyone" ON public.network_stats;
DROP POLICY IF EXISTS "System can insert network stats" ON public.network_stats;
