-- Create worker_heartbeats table for monitoring background worker health
-- This table tracks worker status and enables auto-restart functionality

CREATE TABLE IF NOT EXISTS worker_heartbeats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'error', 'restarting')),
    tasks_processed INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one heartbeat record per user-device combination
    UNIQUE(user_id, device_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_user_id ON worker_heartbeats(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_device_id ON worker_heartbeats(device_id);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_heartbeat ON worker_heartbeats(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_status ON worker_heartbeats(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_worker_heartbeats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_worker_heartbeats_updated_at
    BEFORE UPDATE ON worker_heartbeats
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_heartbeats_updated_at();

-- Row Level Security (RLS)
ALTER TABLE worker_heartbeats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own heartbeats
CREATE POLICY "Users can view own heartbeats" ON worker_heartbeats
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert/update their own heartbeats
CREATE POLICY "Users can manage own heartbeats" ON worker_heartbeats
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Admins can see all heartbeats
CREATE POLICY "Admins can view all heartbeats" ON worker_heartbeats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Function to clean up old heartbeat records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_heartbeats()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM worker_heartbeats 
    WHERE last_heartbeat < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get worker health statistics
CREATE OR REPLACE FUNCTION get_worker_health_stats()
RETURNS TABLE (
    total_workers BIGINT,
    active_workers BIGINT,
    inactive_workers BIGINT,
    error_workers BIGINT,
    workers_last_24h BIGINT,
    avg_uptime_seconds BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_workers,
        COUNT(*) FILTER (WHERE status = 'active') as active_workers,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_workers,
        COUNT(*) FILTER (WHERE status = 'error') as error_workers,
        COUNT(*) FILTER (WHERE last_heartbeat >= NOW() - INTERVAL '24 hours') as workers_last_24h,
        COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))), 0)::BIGINT as avg_uptime_seconds
    FROM worker_heartbeats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect stale workers (no heartbeat in last 5 minutes)
CREATE OR REPLACE FUNCTION get_stale_workers()
RETURNS TABLE (
    user_id UUID,
    device_id TEXT,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    stale_duration INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wh.user_id,
        wh.device_id,
        wh.last_heartbeat,
        NOW() - wh.last_heartbeat as stale_duration
    FROM worker_heartbeats wh
    WHERE wh.last_heartbeat < NOW() - INTERVAL '5 minutes'
    AND wh.status = 'active'
    ORDER BY wh.last_heartbeat ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON worker_heartbeats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_heartbeats TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_health_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_stale_workers TO authenticated;

-- Grant admin permissions
GRANT ALL ON worker_heartbeats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_heartbeats TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_health_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_stale_workers TO authenticated;
