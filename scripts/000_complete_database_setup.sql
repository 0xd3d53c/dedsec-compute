-- ============================================================================
-- DEDSECCOMPUTE - COMPLETE DATABASE SETUP
-- ============================================================================
-- This script sets up the entire database schema from scratch
-- Run this ONCE on a new Supabase project
-- ============================================================================

-- ============================================================================
-- 1. CORE TABLES AND SCHEMA
-- ============================================================================

-- Create users table with enhanced profile management
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  profile_picture_url TEXT,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.users(id),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(64), -- Fixed length for speakeasy compatibility
  backup_codes TEXT[],
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table for real-time tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  hardware_specs JSONB NOT NULL,
  is_contributing BOOLEAN DEFAULT FALSE,
  max_cpu_percent INTEGER DEFAULT 25 CHECK (max_cpu_percent BETWEEN 1 AND 100),
  max_memory_mb INTEGER DEFAULT 512 CHECK (max_memory_mb > 0),
  only_when_charging BOOLEAN DEFAULT TRUE,
  only_when_idle BOOLEAN DEFAULT TRUE,
  battery_level INTEGER,
  temperature_celsius DECIMAL(5,2),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Create followers table for social features
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Create operations table for compute tasks
CREATE TABLE IF NOT EXISTS public.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  required_compute_power INTEGER NOT NULL,
  task_signature VARCHAR(128) NOT NULL,
  task_hash VARCHAR(64) NOT NULL,
  parameters JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  unlock_threshold INTEGER NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_executions table for tracking real computations
CREATE TABLE IF NOT EXISTS public.task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.operations(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  device_id VARCHAR(100) NOT NULL,
  task_data JSONB NOT NULL,
  result_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  compute_time_ms INTEGER,
  -- Added columns for RPC function compatibility
  cpu_time_seconds NUMERIC DEFAULT 0,
  memory_usage_mb NUMERIC DEFAULT 0,
  execution_time_ms NUMERIC DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create network_metrics table for real-time stats
CREATE TABLE IF NOT EXISTS public.network_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_users INTEGER DEFAULT 0,
  total_cpu_cores INTEGER DEFAULT 0,
  total_memory_gb DECIMAL(10,2) DEFAULT 0,
  operations_per_second DECIMAL(10,2) DEFAULT 0,
  network_efficiency DECIMAL(5,2) DEFAULT 0,
  average_latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invite_codes table for tracking invitations
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  used_by UUID REFERENCES public.users(id),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. MISSIONS AND PROGRESS TRACKING
-- ============================================================================

-- Missions catalog
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard','legendary')) DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  requires_admin BOOLEAN DEFAULT FALSE,
  max_participants INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user mission enrollment and state machine
CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('accepted','in_progress','completed','failed','abandoned')) DEFAULT 'accepted',
  progress JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (mission_id, user_id)
);

-- Mission event stream (immutable audit)
CREATE TABLE IF NOT EXISTS public.mission_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Influence/follower metrics events (append-only)
CREATE TABLE IF NOT EXISTS public.influence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow','unfollow','mission_completed','boost','share')),
  delta INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Influence snapshots for fast dashboards
CREATE TABLE IF NOT EXISTS public.follower_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  followers_count INTEGER DEFAULT 0,
  influence_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explicit user consents with versioning and revocation
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('distributed_compute','analytics','marketing')),
  granted BOOLEAN NOT NULL,
  version TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- 3. SECURITY AND MONITORING TABLES
-- ============================================================================

-- Compromise logs for security monitoring
CREATE TABLE IF NOT EXISTS public.compromise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  session_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker heartbeats for monitoring background processes
CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  worker_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'idle', 'error', 'stopped')),
  last_task_id UUID,
  performance_metrics JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard cache for performance
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_type TEXT NOT NULL,
  time_period TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(leaderboard_type, time_period, user_id)
);

-- ============================================================================
-- 4. CORE FUNCTIONS
-- ============================================================================

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    code := 'd3d_' || upper(substring(md5(random()::text) from 1 for 8));
    SELECT COUNT(*) INTO exists_check FROM public.users WHERE invite_code = code;
    IF exists_check = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update task execution metrics automatically
CREATE OR REPLACE FUNCTION update_task_execution_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-populate execution_time_ms from compute_time_ms
    IF NEW.execution_time_ms IS NULL AND NEW.compute_time_ms IS NOT NULL THEN
        NEW.execution_time_ms := NEW.compute_time_ms;
    END IF;
    
    -- Auto-populate cpu_time_seconds from compute_time_ms
    IF NEW.cpu_time_seconds IS NULL AND NEW.compute_time_ms IS NOT NULL THEN
        NEW.cpu_time_seconds := NEW.compute_time_ms::NUMERIC / 1000;
    END IF;
    
    -- Set default memory usage if not provided
    IF NEW.memory_usage_mb IS NULL THEN
        NEW.memory_usage_mb := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val TEXT;
  email_val TEXT;
BEGIN
  -- Extract values from user metadata or use defaults
  username_val := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  email_val := COALESCE(
    NEW.raw_user_meta_data ->> 'email',
    NEW.email
  );
  
  -- Ensure username is unique by appending a number if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = username_val) LOOP
    username_val := username_val || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Insert new user with all required fields
  INSERT INTO public.users (
    id, 
    username, 
    email, 
    invite_code,
    is_admin,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    username_val,
    email_val,
    public.generate_invite_code(),
    FALSE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for task execution metrics
DROP TRIGGER IF EXISTS update_task_execution_metrics_trigger ON public.task_executions;
CREATE TRIGGER update_task_execution_metrics_trigger
    BEFORE INSERT OR UPDATE ON public.task_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_task_execution_metrics();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

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
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follower_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compromise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_system_access" ON public.users FOR ALL USING (auth.role() = 'service_role');

-- User sessions policies
CREATE POLICY "user_sessions_select_own" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_sessions_insert_own" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_sessions_update_own" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_sessions_delete_own" ON public.user_sessions FOR DELETE USING (auth.uid() = user_id);

-- Followers policies
CREATE POLICY "followers_select_own" ON public.followers FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);
CREATE POLICY "followers_insert_own" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_delete_own" ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- Operations policies
CREATE POLICY "operations_select_public" ON public.operations FOR SELECT USING (is_active = TRUE);
CREATE POLICY "operations_insert_admin" ON public.operations FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "operations_update_admin" ON public.operations FOR UPDATE USING (auth.role() = 'service_role');

-- Task executions policies
CREATE POLICY "task_executions_select_own" ON public.task_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "task_executions_insert_own" ON public.task_executions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "task_executions_update_own" ON public.task_executions FOR UPDATE USING (auth.uid() = user_id);

-- Network metrics policies
CREATE POLICY "network_metrics_select_public" ON public.network_metrics FOR SELECT USING (TRUE);
CREATE POLICY "network_metrics_insert_system" ON public.network_metrics FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Achievements policies
CREATE POLICY "achievements_select_public" ON public.achievements FOR SELECT USING (is_active = TRUE);
CREATE POLICY "achievements_insert_admin" ON public.achievements FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "achievements_update_admin" ON public.achievements FOR UPDATE USING (auth.role() = 'service_role');

-- User achievements policies
CREATE POLICY "user_achievements_select_own" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_achievements_insert_own" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin logs policies
CREATE POLICY "admin_logs_select_admin" ON public.admin_logs FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "admin_logs_insert_system" ON public.admin_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Invite codes policies
CREATE POLICY "invite_codes_select_public" ON public.invite_codes FOR SELECT USING (TRUE);
CREATE POLICY "invite_codes_insert_system" ON public.invite_codes FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Mission policies
CREATE POLICY "missions_select_active" ON public.missions FOR SELECT USING (is_active = TRUE);
CREATE POLICY "missions_admin_all" ON public.missions FOR ALL USING (auth.role() = 'service_role');

-- User missions policies
CREATE POLICY "user_missions_own" ON public.user_missions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mission updates policies
CREATE POLICY "mission_updates_participants" ON public.mission_updates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_missions um WHERE um.mission_id = mission_updates.mission_id AND um.user_id = auth.uid())
);
CREATE POLICY "mission_updates_insert_own" ON public.mission_updates FOR INSERT WITH CHECK (user_id = auth.uid());

-- Other table policies (simplified for brevity)
CREATE POLICY "influence_events_own" ON public.influence_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follower_metrics_own" ON public.follower_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_consents_own" ON public.user_consents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "compromise_logs_system" ON public.compromise_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "worker_heartbeats_own" ON public.worker_heartbeats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leaderboard_cache_public" ON public.leaderboard_cache FOR SELECT USING (TRUE);
CREATE POLICY "leaderboard_cache_system" ON public.leaderboard_cache FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON public.users(invite_code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_user ON public.task_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON public.task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_created_at ON public.task_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON public.user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission ON public.user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_updates_mission ON public.mission_updates(mission_id);
CREATE INDEX IF NOT EXISTS idx_influence_events_user ON public.influence_events(user_id);
CREATE INDEX IF NOT EXISTS idx_follower_metrics_user ON public.follower_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_compromise_logs_user ON public.compromise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_user ON public.worker_heartbeats(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_type_period ON public.leaderboard_cache(leaderboard_type, time_period);

-- ============================================================================
-- 8. FINAL VERIFICATION
-- ============================================================================

-- Test that everything is working
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
  RAISE NOTICE 'Functions created: %', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public');
  RAISE NOTICE 'Triggers created: %', (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public');
END;
$$;

