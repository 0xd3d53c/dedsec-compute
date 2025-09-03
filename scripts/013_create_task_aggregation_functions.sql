-- Create server-side aggregation functions for task_executions
-- This moves heavy aggregation logic from client to server for better performance

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
    p_offset INTEGER DEFAULT 0,
    p_status TEXT DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    task_id TEXT,
    status TEXT,
    execution_time_ms INTEGER,
    cpu_time_seconds NUMERIC,
    memory_usage_mb NUMERIC,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.id,
        te.user_id,
        te.task_id,
        te.status,
        te.execution_time_ms,
        te.cpu_time_seconds,
        te.memory_usage_mb,
        te.error_message,
        te.created_at,
        te.completed_at
    FROM task_executions te
    WHERE 
        (p_user_id IS NULL OR te.user_id = p_user_id)
        AND (p_status IS NULL OR te.status = p_status)
        AND (p_start_date IS NULL OR te.created_at >= p_start_date)
        AND (p_end_date IS NULL OR te.created_at <= p_end_date)
    ORDER BY te.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get task execution performance metrics
CREATE OR REPLACE FUNCTION get_task_performance_metrics(
    p_user_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    total_tasks BIGINT,
    completed_tasks BIGINT,
    failed_tasks BIGINT,
    avg_execution_time_ms NUMERIC,
    total_cpu_time_seconds NUMERIC,
    total_memory_usage_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.created_at::DATE as date,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE te.status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE te.status = 'failed') as failed_tasks,
        COALESCE(AVG(te.execution_time_ms), 0) as avg_execution_time_ms,
        COALESCE(SUM(te.cpu_time_seconds), 0) as total_cpu_time_seconds,
        COALESCE(SUM(te.memory_usage_mb), 0) as total_memory_usage_mb
    FROM task_executions te
    WHERE 
        (p_user_id IS NULL OR te.user_id = p_user_id)
        AND te.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY te.created_at::DATE
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user contribution leaderboard
CREATE OR REPLACE FUNCTION get_contribution_leaderboard(
    p_limit INTEGER DEFAULT 50,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    total_tasks BIGINT,
    completed_tasks BIGINT,
    total_cpu_time_seconds NUMERIC,
    total_memory_usage_mb NUMERIC,
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
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE
    ),
    week_stats AS (
        SELECT 
            COUNT(*) as tasks,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COALESCE(SUM(cpu_time_seconds), 0) as cpu_time,
            COALESCE(SUM(memory_usage_mb), 0) as memory_usage
        FROM task_executions
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    month_stats AS (
        SELECT 
            COUNT(*) as tasks,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COALESCE(SUM(cpu_time_seconds), 0) as cpu_time,
            COALESCE(SUM(memory_usage_mb), 0) as memory_usage
        FROM task_executions
        WHERE user_id = p_user_id 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    user_rank AS (
        SELECT 
            ROW_NUMBER() OVER (ORDER BY 
                (SUM(cpu_time_seconds) * 0.4 + SUM(memory_usage_mb) * 0.3 + COUNT(*) FILTER (WHERE status = 'completed') * 0.3) DESC
            ) as rank
        FROM task_executions
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY user_id
        HAVING user_id = p_user_id
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
        ur.rank as current_rank,
        (SELECT COUNT(DISTINCT user_id) FROM task_executions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as total_contributors
    FROM today_stats ts
    CROSS JOIN week_stats ws
    CROSS JOIN month_stats ms
    LEFT JOIN user_rank ur ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_task_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_network_task_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_execution_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_contribution_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_task_summary TO authenticated;
