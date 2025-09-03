-- Setup scheduled maintenance functions for automated leaderboard calculation
-- Note: pg_cron is not available in hosted Supabase, so we use external scheduling
-- This should be triggered by GitHub Actions, Vercel Cron, or similar external scheduler

-- External scheduling options:
-- 1. GitHub Actions: Create a workflow that calls scheduled_maintenance() daily
-- 2. Vercel Cron: Use Vercel's cron jobs to trigger the function
-- 3. External cron server: Set up a server to call the function via API
-- 4. Manual execution: Run scheduled_maintenance() manually when needed

-- Example GitHub Actions workflow (create in .github/workflows/maintenance.yml):
-- name: Database Maintenance
-- on:
--   schedule:
--     - cron: '0 1 * * *'  # Daily at 1 AM UTC
-- jobs:
--   maintenance:
--     runs-on: ubuntu-latest
--     steps:
--       - name: Run Database Maintenance
--         run: |
--           curl -X POST "https://your-project.supabase.co/rest/v1/rpc/scheduled_maintenance" \
--                -H "apikey: YOUR_ANON_KEY" \
--                -H "Authorization: Bearer YOUR_ANON_KEY" \
--                -H "Content-Type: application/json"

-- Function to manually trigger leaderboard update (for testing)
CREATE OR REPLACE FUNCTION trigger_leaderboard_update()
RETURNS TABLE (
    period_type TEXT,
    period_start DATE,
    entries_calculated INTEGER
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM update_all_leaderboards();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cron job status
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS TABLE (
    jobid BIGINT,
    schedule TEXT,
    command TEXT,
    nodename TEXT,
    nodeport INTEGER,
    database TEXT,
    username TEXT,
    active BOOLEAN,
    jobname TEXT
) AS $$
BEGIN
    -- This function requires pg_cron extension
    -- RETURN QUERY SELECT * FROM cron.job;
    RETURN QUERY SELECT 
        0::BIGINT as jobid,
        'N/A'::TEXT as schedule,
        'pg_cron not available'::TEXT as command,
        'N/A'::TEXT as nodename,
        0::INTEGER as nodeport,
        'N/A'::TEXT as database,
        'N/A'::TEXT as username,
        false::BOOLEAN as active,
        'N/A'::TEXT as jobname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION trigger_leaderboard_update TO authenticated;
GRANT EXECUTE ON FUNCTION get_cron_job_status TO authenticated;

-- Alternative: Create a simple scheduled function that can be called externally
-- This doesn't require pg_cron but needs to be called by an external scheduler
CREATE OR REPLACE FUNCTION scheduled_maintenance()
RETURNS JSONB AS $$
DECLARE
    leaderboard_result JSONB;
    cleanup_result JSONB;
BEGIN
    -- Update leaderboards
    SELECT jsonb_agg(
        jsonb_build_object(
            'period_type', period_type,
            'period_start', period_start,
            'entries_calculated', entries_calculated
        )
    ) INTO leaderboard_result
    FROM update_all_leaderboards();
    
    -- Cleanup old data
    SELECT jsonb_build_object(
        'leaderboard_cache_cleaned', cleanup_old_leaderboard_cache(),
        'compromise_logs_cleaned', 0, -- Add cleanup function if needed
        'heartbeats_cleaned', (
            DELETE FROM worker_heartbeats 
            WHERE last_heartbeat < NOW() - INTERVAL '7 days'
        )
    ) INTO cleanup_result;
    
    RETURN jsonb_build_object(
        'timestamp', NOW(),
        'leaderboards_updated', leaderboard_result,
        'cleanup_performed', cleanup_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for scheduled maintenance
GRANT EXECUTE ON FUNCTION scheduled_maintenance TO authenticated;

-- Create a view for monitoring cron job health
CREATE OR REPLACE VIEW cron_job_health AS
SELECT 
    'leaderboard_cache' as job_name,
    COUNT(*) as total_entries,
    MAX(updated_at) as last_updated,
    CASE 
        WHEN MAX(updated_at) > NOW() - INTERVAL '2 days' THEN 'healthy'
        ELSE 'stale'
    END as status
FROM leaderboard_cache
UNION ALL
SELECT 
    'worker_heartbeats' as job_name,
    COUNT(*) as total_entries,
    MAX(last_heartbeat) as last_updated,
    CASE 
        WHEN MAX(last_heartbeat) > NOW() - INTERVAL '1 hour' THEN 'healthy'
        ELSE 'stale'
    END as status
FROM worker_heartbeats
UNION ALL
SELECT 
    'compromise_logs' as job_name,
    COUNT(*) as total_entries,
    MAX(created_at) as last_updated,
    CASE 
        WHEN MAX(created_at) > NOW() - INTERVAL '1 day' THEN 'healthy'
        ELSE 'stale'
    END as status
FROM compromise_logs;

-- Grant read access to the health view
GRANT SELECT ON cron_job_health TO authenticated;
