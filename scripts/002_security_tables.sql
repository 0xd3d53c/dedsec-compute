-- ============================================================================
-- DEDSECCOMPUTE - SECURITY TABLES SETUP
-- ============================================================================
-- This script creates security monitoring tables for admin panel
-- Run this after the main database setup
-- ============================================================================

-- ============================================================================
-- SECURITY EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'failed_login', 'password_change', '2fa_enabled', '2fa_disabled', 'suspicious_activity'
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMPROMISE EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.compromise_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'account_compromise', 'data_breach', 'suspicious_login', 'unusual_activity'
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADMIN LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- 'user_created', 'user_updated', 'user_deleted', 'permissions_changed', etc.
  target_type VARCHAR(50), -- 'user', 'mission', 'system', etc.
  target_id UUID, -- ID of the target object
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

CREATE INDEX IF NOT EXISTS idx_compromise_events_user_id ON public.compromise_events(user_id);
CREATE INDEX IF NOT EXISTS idx_compromise_events_created_at ON public.compromise_events(created_at);
CREATE INDEX IF NOT EXISTS idx_compromise_events_event_type ON public.compromise_events(event_type);
CREATE INDEX IF NOT EXISTS idx_compromise_events_severity ON public.compromise_events(severity);
CREATE INDEX IF NOT EXISTS idx_compromise_events_resolved ON public.compromise_events(resolved);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_type ON public.admin_logs(target_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compromise_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Security events: Only admins can view all, users can view their own
CREATE POLICY "Admins can view all security events" ON public.security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

CREATE POLICY "Users can view their own security events" ON public.security_events
  FOR SELECT USING (user_id = auth.uid());

-- Compromise events: Only admins can view
CREATE POLICY "Only admins can view compromise events" ON public.compromise_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Admin logs: Only admins can view
CREATE POLICY "Only admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- ============================================================================
-- FUNCTIONS FOR LOGGING
-- ============================================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_severity VARCHAR(20) DEFAULT 'info',
  p_description TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    severity,
    description,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_severity,
    COALESCE(p_description, p_event_type),
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log compromise events
CREATE OR REPLACE FUNCTION public.log_compromise_event(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_severity VARCHAR(20) DEFAULT 'medium',
  p_description TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.compromise_events (
    user_id,
    event_type,
    severity,
    description,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_severity,
    COALESCE(p_description, p_event_type),
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id UUID,
  p_action VARCHAR(100),
  p_target_type VARCHAR(50) DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    p_action,
    p_target_type,
    p_target_id,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC LOGGING
-- ============================================================================

-- Trigger to log user login events
CREATE OR REPLACE FUNCTION public.trigger_log_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Log successful login
  PERFORM public.log_security_event(
    NEW.id,
    'login',
    'info',
    'User logged in successfully',
    NULL, -- IP address would be passed from application
    NULL, -- User agent would be passed from application
    jsonb_build_object('login_time', NEW.last_login)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log admin actions on users
CREATE OR REPLACE FUNCTION public.trigger_log_admin_user_actions()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Get the current admin user ID (this would need to be set by the application)
  -- For now, we'll use a placeholder
  admin_id := auth.uid();
  
  -- Log the change
  IF OLD.is_active != NEW.is_active THEN
    PERFORM public.log_admin_action(
      admin_id,
      CASE WHEN NEW.is_active THEN 'user_activated' ELSE 'user_deactivated' END,
      'user',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.is_active,
        'new_status', NEW.is_active,
        'username', NEW.username
      )
    );
  END IF;
  
  IF OLD.is_admin != NEW.is_admin THEN
    PERFORM public.log_admin_action(
      admin_id,
      CASE WHEN NEW.is_admin THEN 'admin_privileges_granted' ELSE 'admin_privileges_revoked' END,
      'user',
      NEW.id,
      jsonb_build_object(
        'old_admin_status', OLD.is_admin,
        'new_admin_status', NEW.is_admin,
        'username', NEW.username
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_user_login_log ON public.users;
CREATE TRIGGER trigger_user_login_log
  AFTER UPDATE OF last_login ON public.users
  FOR EACH ROW
  WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
  EXECUTE FUNCTION public.trigger_log_user_login();

DROP TRIGGER IF EXISTS trigger_admin_user_actions_log ON public.users;
CREATE TRIGGER trigger_admin_user_actions_log
  AFTER UPDATE ON public.users
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active OR OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION public.trigger_log_admin_user_actions();

-- ============================================================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================================================

-- Insert some sample security events for testing
INSERT INTO public.security_events (user_id, event_type, severity, description, metadata) 
SELECT 
  u.id,
  'login',
  'info',
  'Sample login event',
  jsonb_build_object('sample', true)
FROM public.users u 
WHERE u.is_admin = true 
LIMIT 1;

-- Insert some sample admin logs
INSERT INTO public.admin_logs (admin_id, action, target_type, details)
SELECT 
  u.id,
  'system_initialized',
  'system',
  jsonb_build_object('initialization', true, 'timestamp', NOW())
FROM public.users u 
WHERE u.is_admin = true 
LIMIT 1;
