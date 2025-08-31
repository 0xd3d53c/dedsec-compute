-- Enhanced database schema with 2FA, profile management, and production features
-- Create users table with enhanced profile management
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  profile_picture_url TEXT,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  invited_by UUID REFERENCES public.users(id),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(32),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  task_signature VARCHAR(128) NOT NULL, -- Cryptographic signature
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

-- Enable Row Level Security
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

-- RLS Policies for users table
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

-- RLS Policies for user_sessions table
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS Policies for followers table
CREATE POLICY "Users can view followers" ON public.followers
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can manage their own follows" ON public.followers
  FOR ALL USING (auth.uid() = follower_id);

-- RLS Policies for operations table
CREATE POLICY "Anyone can view active operations" ON public.operations
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage operations" ON public.operations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS Policies for task_executions table
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

-- RLS Policies for network_metrics table
CREATE POLICY "Anyone can view network metrics" ON public.network_metrics
  FOR SELECT USING (TRUE);

CREATE POLICY "System can insert network metrics" ON public.network_metrics
  FOR INSERT WITH CHECK (TRUE);

-- RLS Policies for achievements table
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage achievements" ON public.achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS Policies for user_achievements table
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (TRUE);

-- RLS Policies for admin_logs table
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "System can insert admin logs" ON public.admin_logs
  FOR INSERT WITH CHECK (TRUE);

-- RLS Policies for invite_codes table
CREATE POLICY "Users can view their own invite codes" ON public.invite_codes
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create invite codes" ON public.invite_codes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can view active invite codes for redemption" ON public.invite_codes
  FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Insert initial achievements
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, points) VALUES
  ('First Contribution', 'Complete your first computing task', 'cpu', 'tasks_completed', 1, 10),
  ('Power User', 'Complete 100 computing tasks', 'zap', 'tasks_completed', 100, 100),
  ('Network Builder', 'Invite 5 users to the network', 'users', 'invites_sent', 5, 50),
  ('Efficiency Expert', 'Maintain 95% task success rate over 50 tasks', 'target', 'success_rate', 95, 75),
  ('Marathon Runner', 'Contribute computing power for 24 hours total', 'clock', 'compute_hours', 24, 200)
ON CONFLICT DO NOTHING;

-- Insert sample operations with production-ready parameters
INSERT INTO public.operations (name, description, required_compute_power, task_signature, task_hash, unlock_threshold, parameters) VALUES
  (
    'OPERATION_PRIME_SWEEP', 
    'Search for large prime numbers using distributed Sieve of Eratosthenes', 
    100, 
    'sig_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    'hash_prime_sweep_v1_2024',
    50,
    '{"algorithm": "sieve_eratosthenes", "range_size": 1000000, "target_primes": 100}'
  ),
  (
    'OPERATION_CRYPTO_ANALYSIS', 
    'Distributed cryptographic hash analysis and pattern detection', 
    500, 
    'sig_z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1',
    'hash_crypto_analysis_v1_2024',
    200,
    '{"hash_function": "sha256", "pattern_length": 8, "iterations": 10000}'
  ),
  (
    'OPERATION_DATA_MATRIX', 
    'Large-scale matrix multiplication for machine learning operations', 
    1000, 
    'sig_f1e2d3c4b5a6z7y8x9w0v1u2t3s4r5q6p7o8n9m0l1k2j3i4h5g6',
    'hash_data_matrix_v1_2024',
    500,
    '{"matrix_size": 1000, "precision": "float64", "operations": ["multiply", "transpose"]}'
  )
ON CONFLICT DO NOTHING;
