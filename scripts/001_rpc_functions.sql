-- ============================================================================
-- DEDSECCOMPUTE - RPC FUNCTIONS
-- ============================================================================
-- This script creates all the RPC functions needed by the application
-- Run this AFTER the main database setup
-- ============================================================================

-- Function to get user task execution statistics
CREATE OR REPLACE FUNCTION get_user_task_stats(p_user_id UUID)
RETURNS TABLE (
    total_tasks BIGINT,
    completed_tasks BIGINT,
    failed_tasks BIGINT,
    total_cpu_time_seconds BIGINT,
    total_memory_usage_mb BIGINT,
    avg_execution_time_ms NUMERIC,
    success_rate NUMERIC,
    last_execution TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
        COALESCE(SUM(cpu_time_seconds), 0)::BIGINT as total_cpu_time_seconds,
        COALESCE(SUM(memory_usage_mb), 0)::BIGINT as total_memory_usage_mb,
        COALESCE(AVG(execution_time_ms), 0) as avg_execution_time_ms,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0 
        END as success_rate,
        MAX(created_at) as last_execution
    FROM task_executions
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get network-wide task execution statistics
CREATE OR REPLACE FUNCTION get_network_task_stats()
RETURNS TABLE (
    total_tasks BIGINT,
    completed_tasks BIGINT,
    failed_tasks BIGINT,
    active_tasks BIGINT,
    total_cpu_time_seconds BIGINT,
    total_memory_usage_mb BIGINT,
    avg_execution_time_ms NUMERIC,
    success_rate NUMERIC,
    tasks_last_24h BIGINT,
    tasks_last_7d BIGINT,
    top_contributors JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH contributor_stats AS (
        SELECT 
            user_id,
            COUNT(*) as task_count,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_count
        FROM task_executions
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
        ORDER BY task_count DESC
        LIMIT 10
    )
    SELECT 
        (SELECT COUNT(*) FROM task_executions) as total_tasks,
        (SELECT COUNT(*) FROM task_executions WHERE status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM task_executions WHERE status = 'failed') as failed_tasks,
        (SELECT COUNT(*) FROM task_executions WHERE status = 'running') as active_tasks,
        (SELECT COALESCE(SUM(cpu_time_seconds), 0)::BIGINT FROM task_executions) as total_cpu_time_seconds,
        (SELECT COALESCE(SUM(memory_usage_mb), 0)::BIGINT FROM task_executions) as total_memory_usage_mb,
        (SELECT COALESCE(AVG(execution_time_ms), 0) FROM task_executions) as avg_execution_time_ms,
        CASE 
            WHEN (SELECT COUNT(*) FROM task_executions) > 0 THEN 
                ((SELECT COUNT(*) FROM task_executions WHERE status = 'completed')::NUMERIC / 
                 (SELECT COUNT(*) FROM task_executions)::NUMERIC) * 100
            ELSE 0 
        END as success_rate,
        (SELECT COUNT(*) FROM task_executions WHERE created_at >= NOW() - INTERVAL '24 hours') as tasks_last_24h,
        (SELECT COUNT(*) FROM task_executions WHERE created_at >= NOW() - INTERVAL '7 days') as tasks_last_7d,
        (SELECT jsonb_agg(
            jsonb_build_object(
                'user_id', cs.user_id,
                'task_count', cs.task_count,
                'completed_count', cs.completed_count
            )
        ) FROM contributor_stats cs) as top_contributors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get task execution history with pagination
CREATE OR REPLACE FUNCTION get_task_execution_history(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    operation_id UUID,
    user_id UUID,
    device_id VARCHAR(100),
    status VARCHAR(20),
    execution_time_ms NUMERIC,
    cpu_time_seconds NUMERIC,
    memory_usage_mb NUMERIC,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    operation_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.id,
        te.operation_id,
        te.user_id,
        te.device_id,
        te.status,
        te.execution_time_ms,
        te.cpu_time_seconds,
        te.memory_usage_mb,
        te.error_message,
        te.created_at,
        te.completed_at,
        o.name as operation_name
    FROM task_executions te
    JOIN operations o ON o.id = te.operation_id
    WHERE (p_user_id IS NULL OR te.user_id = p_user_id)
    ORDER BY te.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get task performance metrics
CREATE OR REPLACE FUNCTION get_task_performance_metrics(
    p_operation_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    operation_id UUID,
    operation_name VARCHAR(100),
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    avg_execution_time_ms NUMERIC,
    min_execution_time_ms NUMERIC,
    max_execution_time_ms NUMERIC,
    avg_cpu_time_seconds NUMERIC,
    avg_memory_usage_mb NUMERIC,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as operation_id,
        o.name as operation_name,
        COUNT(te.id) as total_executions,
        COUNT(te.id) FILTER (WHERE te.status = 'completed') as successful_executions,
        COUNT(te.id) FILTER (WHERE te.status = 'failed') as failed_executions,
        COALESCE(AVG(te.execution_time_ms), 0) as avg_execution_time_ms,
        COALESCE(MIN(te.execution_time_ms), 0) as min_execution_time_ms,
        COALESCE(MAX(te.execution_time_ms), 0) as max_execution_time_ms,
        COALESCE(AVG(te.cpu_time_seconds), 0) as avg_cpu_time_seconds,
        COALESCE(AVG(te.memory_usage_mb), 0) as avg_memory_usage_mb,
        CASE 
            WHEN COUNT(te.id) > 0 THEN 
                (COUNT(te.id) FILTER (WHERE te.status = 'completed')::NUMERIC / COUNT(te.id)::NUMERIC) * 100
            ELSE 0 
        END as success_rate
    FROM operations o
    LEFT JOIN task_executions te ON te.operation_id = o.id 
        AND te.created_at >= NOW() - (p_days || ' days')::INTERVAL
    WHERE (p_operation_id IS NULL OR o.id = p_operation_id)
    GROUP BY o.id, o.name
    ORDER BY total_executions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get contribution leaderboard
CREATE OR REPLACE FUNCTION get_contribution_leaderboard(
    p_days INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username VARCHAR(50),
    total_tasks BIGINT,
    completed_tasks BIGINT,
    total_cpu_time_seconds BIGINT,
    total_memory_usage_mb BIGINT,
    success_rate NUMERIC,
    contribution_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            te.user_id,
            u.username,
            COUNT(*) as total_tasks,
            COUNT(*) FILTER (WHERE te.status = 'completed') as completed_tasks,
            COALESCE(SUM(te.cpu_time_seconds), 0) as total_cpu_time_seconds,
            COALESCE(SUM(te.memory_usage_mb), 0) as total_memory_usage_mb,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    (COUNT(*) FILTER (WHERE te.status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100
                ELSE 0 
            END as success_rate
        FROM task_executions te
        JOIN users u ON u.id = te.user_id
        WHERE te.created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY te.user_id, u.username
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY 
            (us.total_cpu_time_seconds * 0.4 + us.total_memory_usage_mb * 0.3 + us.completed_tasks * 0.3) DESC
        ) as rank,
        us.user_id,
        us.username,
        us.total_tasks,
        us.completed_tasks,
        us.total_cpu_time_seconds,
        us.total_memory_usage_mb,
        us.success_rate,
        (us.total_cpu_time_seconds * 0.4 + us.total_memory_usage_mb * 0.3 + us.completed_tasks * 0.3) as contribution_score
    FROM user_stats us
    ORDER BY contribution_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get task execution summary for dashboard
CREATE OR REPLACE FUNCTION get_dashboard_task_summary(p_user_id UUID)
RETURNS TABLE (
    today_tasks BIGINT,
    today_completed BIGINT,
    today_cpu_time NUMERIC,
    today_memory_usage NUMERIC,
    week_tasks BIGINT,
    week_completed BIGINT,
    week_cpu_time NUMERIC,
    week_memory_usage NUMERIC,
    month_tasks BIGINT,
    month_completed BIGINT,
    month_cpu_time NUMERIC,
    month_memory_usage NUMERIC,
    current_rank BIGINT,
    total_contributors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH today_stats AS (
        SELECT 
            COUNT(*) as tasks,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COALESCE(SUM(cpu_time_seconds), 0) as cpu_time,
            COALESCE(SUM(memory_usage_mb), 0) as memory_usage
        FROM task_executions
        WHERE user_id = p_user_id AND created_at >= CURRENT_DATE
    ),
    week_stats AS (
        SELECT 
            COUNT(*) as tasks,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COALESCE(SUM(cpu_time_seconds), 0) as cpu_time,
            COALESCE(SUM(memory_usage_mb), 0) as memory_usage
        FROM task_executions
        WHERE user_id = p_user_id AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    month_stats AS (
        SELECT 
            COUNT(*) as tasks,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COALESCE(SUM(cpu_time_seconds), 0) as cpu_time,
            COALESCE(SUM(memory_usage_mb), 0) as memory_usage
        FROM task_executions
        WHERE user_id = p_user_id AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    user_rank AS (
        SELECT rank FROM get_contribution_leaderboard(30, 1000)
        WHERE user_id = p_user_id
        LIMIT 1
    )
    SELECT 
        ts.tasks as today_tasks,
        ts.completed as today_completed,
        ts.cpu_time as today_cpu_time,
        ts.memory_usage as today_memory_usage,
        ws.tasks as week_tasks,
        ws.completed as week_completed,
        ws.cpu_time as week_cpu_time,
        ws.memory_usage as week_memory_usage,
        ms.tasks as month_tasks,
        ms.completed as month_completed,
        ms.cpu_time as month_cpu_time,
        ms.memory_usage as month_memory_usage,
        COALESCE(ur.rank, 0) as current_rank,
        (SELECT COUNT(DISTINCT user_id) FROM task_executions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as total_contributors
    FROM today_stats ts
    CROSS JOIN week_stats ws
    CROSS JOIN month_stats ms
    LEFT JOIN user_rank ur ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log compromise events
CREATE OR REPLACE FUNCTION log_compromise_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_severity TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO compromise_logs (user_id, event_type, severity, description, metadata)
    VALUES (p_user_id, p_event_type, p_severity, p_description, p_metadata)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve compromise events
CREATE OR REPLACE FUNCTION resolve_compromise_event(
    p_log_id UUID,
    p_resolved_by UUID,
    p_resolution_notes TEXT
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

-- Function to get security dashboard stats
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

-- Function to update leaderboard cache
CREATE OR REPLACE FUNCTION update_leaderboard_cache(
    p_leaderboard_type TEXT,
    p_time_period TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Clear existing cache for this leaderboard type and time period
    DELETE FROM leaderboard_cache 
    WHERE leaderboard_type = p_leaderboard_type AND time_period = p_time_period;
    
    -- Insert new leaderboard data
    INSERT INTO leaderboard_cache (leaderboard_type, time_period, user_id, username, rank, score, metadata)
    SELECT 
        p_leaderboard_type,
        p_time_period,
        user_id,
        username,
        rank,
        contribution_score,
        jsonb_build_object(
            'total_tasks', total_tasks,
            'completed_tasks', completed_tasks,
            'success_rate', success_rate
        )
    FROM get_contribution_leaderboard(
        CASE p_time_period 
            WHEN 'daily' THEN 1
            WHEN 'weekly' THEN 7
            WHEN 'monthly' THEN 30
            ELSE 30
        END,
        100
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cached leaderboard
CREATE OR REPLACE FUNCTION get_cached_leaderboard(
    p_leaderboard_type TEXT,
    p_time_period TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank INTEGER,
    user_id UUID,
    username VARCHAR(50),
    score NUMERIC,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lc.rank::INTEGER,
        lc.user_id,
        lc.username,
        lc.score,
        lc.metadata
    FROM leaderboard_cache lc
    WHERE lc.leaderboard_type = p_leaderboard_type 
      AND lc.time_period = p_time_period
    ORDER BY lc.rank
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for scheduled maintenance
CREATE OR REPLACE FUNCTION scheduled_maintenance()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    deleted_count INTEGER;
BEGIN
    -- Clean up old task executions (older than 90 days)
    DELETE FROM task_executions 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || format('Deleted %s old task executions. ', deleted_count);
    
    -- Clean up old compromise logs (older than 180 days)
    DELETE FROM compromise_logs 
    WHERE created_at < NOW() - INTERVAL '180 days' AND resolved = TRUE;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || format('Deleted %s resolved compromise logs. ', deleted_count);
    
    -- Clean up old worker heartbeats (older than 7 days)
    DELETE FROM worker_heartbeats 
    WHERE updated_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    result_text := result_text || format('Deleted %s old worker heartbeats. ', deleted_count);
    
    -- Update leaderboard caches
    PERFORM update_leaderboard_cache('contribution', 'daily');
    PERFORM update_leaderboard_cache('contribution', 'weekly');
    PERFORM update_leaderboard_cache('contribution', 'monthly');
    result_text := result_text || 'Updated leaderboard caches. ';
    
    -- Update network metrics
    INSERT INTO network_metrics (
        active_users,
        total_cpu_cores,
        total_memory_gb,
        operations_per_second,
        network_efficiency,
        average_latency_ms
    )
    SELECT 
        (SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_active >= NOW() - INTERVAL '1 hour'),
        (SELECT COALESCE(SUM((hardware_specs->>'cpu_cores')::INTEGER), 0) FROM user_sessions WHERE is_contributing = TRUE),
        (SELECT COALESCE(SUM((hardware_specs->>'total_memory_gb')::NUMERIC), 0) FROM user_sessions WHERE is_contributing = TRUE),
        (SELECT COUNT(*) FROM task_executions WHERE created_at >= NOW() - INTERVAL '1 minute')::DECIMAL / 60,
        75.0, -- Default efficiency
        50    -- Default latency
    ;
    result_text := result_text || 'Updated network metrics. ';
    
    RETURN result_text || 'Maintenance completed successfully.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_task_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_network_task_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_execution_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_contribution_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_task_summary TO authenticated;
GRANT EXECUTE ON FUNCTION log_compromise_event TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_compromise_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION scheduled_maintenance TO authenticated;

-- Grant service role permissions for system functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RPC Functions setup completed successfully!';
  RAISE NOTICE 'Functions created: %', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_%');
END;
$$;

