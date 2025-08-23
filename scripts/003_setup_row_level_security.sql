-- Renamed from seed data to RLS setup for better organization
-- Row Level Security Policies
-- Ensures data security and proper access control

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any user" ON public.users FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Devices policies
CREATE POLICY "Users can view own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own devices" ON public.devices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all devices" ON public.devices FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Missions policies
CREATE POLICY "Missions are viewable by everyone" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Admins can manage missions" ON public.missions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- Task assignments policies
CREATE POLICY "Users can view own tasks" ON public.task_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.task_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert tasks" ON public.task_assignments FOR INSERT WITH CHECK (true);

-- Contribution sessions policies
CREATE POLICY "Users can view own sessions" ON public.contribution_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON public.contribution_sessions FOR ALL USING (auth.uid() = user_id);

-- Social features policies
CREATE POLICY "Follows are viewable by everyone" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON public.user_follows FOR ALL USING (auth.uid() = follower_id);

-- Achievements policies
CREATE POLICY "Achievements are viewable by everyone" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "User achievements are viewable by everyone" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "System can award achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);

-- Invites policies
CREATE POLICY "Users can view own invites" ON public.invites FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create invites" ON public.invites FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Anyone can view active invites" ON public.invites FOR SELECT USING (is_active = true);

-- Network stats policies
CREATE POLICY "Network stats are viewable by everyone" ON public.network_stats FOR SELECT USING (true);
CREATE POLICY "System can insert network stats" ON public.network_stats FOR INSERT WITH CHECK (true);

-- Admin logs policies
CREATE POLICY "Admins can view admin logs" ON public.admin_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "System can insert admin logs" ON public.admin_logs FOR INSERT WITH CHECK (true);
