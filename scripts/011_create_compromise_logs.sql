-- Create compromise_logs table for security audit trail
-- This table logs all security events and compromise detection attempts

CREATE TABLE IF NOT EXISTS compromise_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'compromise_detected',
        'suspicious_activity',
        'failed_login_attempt',
        'unusual_access_pattern',
        'security_alert',
        'admin_action',
        'data_breach_attempt',
        'unauthorized_access'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_compromise_logs_user_id ON compromise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_compromise_logs_event_type ON compromise_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_compromise_logs_severity ON compromise_logs(severity);
CREATE INDEX IF NOT EXISTS idx_compromise_logs_created_at ON compromise_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_compromise_logs_resolved ON compromise_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_compromise_logs_ip_address ON compromise_logs(ip_address);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_compromise_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compromise_logs_updated_at
    BEFORE UPDATE ON compromise_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_compromise_logs_updated_at();

-- Row Level Security (RLS)
ALTER TABLE compromise_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own compromise logs
CREATE POLICY "Users can view own compromise logs" ON compromise_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can see all compromise logs
CREATE POLICY "Admins can view all compromise logs" ON compromise_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Policy: System can insert compromise logs (for automated logging)
CREATE POLICY "System can insert compromise logs" ON compromise_logs
    FOR INSERT WITH CHECK (true);

-- Create function to log compromise events
CREATE OR REPLACE FUNCTION log_compromise_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_severity TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO compromise_logs (
        user_id,
        event_type,
        severity,
        description,
        metadata,
        ip_address,
        user_agent,
        session_id
    ) VALUES (
        p_user_id,
        p_event_type,
        p_severity,
        p_description,
        p_metadata,
        p_ip_address,
        p_user_agent,
        p_session_id
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resolve compromise events
CREATE OR REPLACE FUNCTION resolve_compromise_event(
    p_log_id UUID,
    p_resolution_notes TEXT,
    p_resolved_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE compromise_logs 
    SET 
        resolved = TRUE,
        resolved_at = NOW(),
        resolved_by = p_resolved_by,
        resolution_notes = p_resolution_notes
    WHERE id = p_log_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get security dashboard stats
CREATE OR REPLACE FUNCTION get_security_dashboard_stats()
RETURNS TABLE (
    total_events BIGINT,
    unresolved_events BIGINT,
    critical_events BIGINT,
    events_last_24h BIGINT,
    events_last_7d BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE resolved = FALSE) as unresolved_events,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as events_last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as events_last_7d
    FROM compromise_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT ON compromise_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_compromise_event TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_compromise_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_dashboard_stats TO authenticated;

-- Grant admin permissions
GRANT ALL ON compromise_logs TO authenticated;
GRANT EXECUTE ON FUNCTION log_compromise_event TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_compromise_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_dashboard_stats TO authenticated;
