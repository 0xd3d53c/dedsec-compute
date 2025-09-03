-- Create leaderboard system with automated calculation and caching
-- This moves leaderboard calculation to the backend for better performance

-- Create leaderboard cache table
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    rank INTEGER NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    total_tasks BIGINT NOT NULL DEFAULT 0,
    completed_tasks BIGINT NOT NULL DEFAULT 0,
    total_cpu_time_seconds NUMERIC NOT NULL DEFAULT 0,
    total_memory_usage_mb NUMERIC NOT NULL DEFAULT 0,
    success_rate NUMERIC NOT NULL DEFAULT 0,
    contribution_score NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique ranking per period
    UNIQUE(period_type, period_start, rank)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_period ON leaderboard_cache(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_user_id ON leaderboard_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON leaderboard_cache(period_type, period_start, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_contribution_score ON leaderboard_cache(period_type, period_start, contribution_score DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_leaderboard_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leaderboard_cache_updated_at
    BEFORE UPDATE ON leaderboard_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_cache_updated_at();

-- Row Level Security (RLS)
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read leaderboard cache
CREATE POLICY "Anyone can read leaderboard cache" ON leaderboard_cache
    FOR SELECT USING (true);

-- Policy: Only system can insert/update leaderboard cache
CREATE POLICY "System can manage leaderboard cache" ON leaderboard_cache
    FOR ALL USING (true);

-- Function to calculate and cache leaderboard for a specific period
CREATE OR REPLACE FUNCTION calculate_leaderboard_cache(
    p_period_type TEXT,
    p_period_start DATE,
    p_period_end DATE,
    p_limit INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
    user_stats RECORD;
    current_rank INTEGER := 1;
    inserted_count INTEGER := 0;
BEGIN
    -- Clear existing cache for this period
    DELETE FROM leaderboard_cache 
    WHERE period_type = p_period_type 
    AND period_start = p_period_start;
    
    -- Calculate leaderboard for the period
    FOR user_stats IN
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
            END as success_rate,
            (COALESCE(SUM(te.cpu_time_seconds), 0) * 0.4 + 
             COALESCE(SUM(te.memory_usage_mb), 0) * 0.3 + 
             COUNT(*) FILTER (WHERE te.status = 'completed') * 0.3) as contribution_score
        FROM task_executions te
        JOIN users u ON u.id = te.user_id
        WHERE te.created_at >= p_period_start 
        AND te.created_at < p_period_end + INTERVAL '1 day'
        GROUP BY te.user_id, u.username
        HAVING COUNT(*) > 0
        ORDER BY contribution_score DESC
        LIMIT p_limit
    LOOP
        INSERT INTO leaderboard_cache (
            period_type,
            period_start,
            period_end,
            rank,
            user_id,
            username,
            total_tasks,
            completed_tasks,
            total_cpu_time_seconds,
            total_memory_usage_mb,
            success_rate,
            contribution_score
        ) VALUES (
            p_period_type,
            p_period_start,
            p_period_end,
            current_rank,
            user_stats.user_id,
            user_stats.username,
            user_stats.total_tasks,
            user_stats.completed_tasks,
            user_stats.total_cpu_time_seconds,
            user_stats.total_memory_usage_mb,
            user_stats.success_rate,
            user_stats.contribution_score
        );
        
        current_rank := current_rank + 1;
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cached leaderboard
CREATE OR REPLACE FUNCTION get_cached_leaderboard(
    p_period_type TEXT DEFAULT 'weekly',
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank INTEGER,
    user_id UUID,
    username TEXT,
    total_tasks BIGINT,
    completed_tasks BIGINT,
    total_cpu_time_seconds NUMERIC,
    total_memory_usage_mb NUMERIC,
    success_rate NUMERIC,
    contribution_score NUMERIC
) AS $$
DECLARE
    latest_period_start DATE;
BEGIN
    -- Get the latest period start for the given period type
    SELECT MAX(period_start) INTO latest_period_start
    FROM leaderboard_cache
    WHERE period_type = p_period_type;
    
    -- Return cached leaderboard
    RETURN QUERY
    SELECT 
        lc.rank,
        lc.user_id,
        lc.username,
        lc.total_tasks,
        lc.completed_tasks,
        lc.total_cpu_time_seconds,
        lc.total_memory_usage_mb,
        lc.success_rate,
        lc.contribution_score
    FROM leaderboard_cache lc
    WHERE lc.period_type = p_period_type
    AND lc.period_start = latest_period_start
    ORDER BY lc.rank
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's rank in leaderboard
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(
    p_user_id UUID,
    p_period_type TEXT DEFAULT 'weekly'
)
RETURNS TABLE (
    rank INTEGER,
    total_contributors BIGINT,
    contribution_score NUMERIC,
    percentile NUMERIC
) AS $$
DECLARE
    user_rank INTEGER;
    total_contributors BIGINT;
    user_score NUMERIC;
BEGIN
    -- Get user's rank and score
    SELECT 
        lc.rank,
        lc.contribution_score
    INTO user_rank, user_score
    FROM leaderboard_cache lc
    WHERE lc.user_id = p_user_id
    AND lc.period_type = p_period_type
    AND lc.period_start = (
        SELECT MAX(period_start) 
        FROM leaderboard_cache 
        WHERE period_type = p_period_type
    );
    
    -- Get total contributors
    SELECT COUNT(*) INTO total_contributors
    FROM leaderboard_cache lc
    WHERE lc.period_type = p_period_type
    AND lc.period_start = (
        SELECT MAX(period_start) 
        FROM leaderboard_cache 
        WHERE period_type = p_period_type
    );
    
    -- Calculate percentile
    RETURN QUERY
    SELECT 
        COALESCE(user_rank, 0) as rank,
        total_contributors,
        COALESCE(user_score, 0) as contribution_score,
        CASE 
            WHEN total_contributors > 0 AND user_rank IS NOT NULL THEN
                ((total_contributors - user_rank + 1)::NUMERIC / total_contributors::NUMERIC) * 100
            ELSE 0
        END as percentile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update all leaderboard periods (for cron job)
CREATE OR REPLACE FUNCTION update_all_leaderboards()
RETURNS TABLE (
    period_type TEXT,
    period_start DATE,
    entries_calculated INTEGER
) AS $$
DECLARE
    daily_start DATE;
    weekly_start DATE;
    monthly_start DATE;
    all_time_start DATE;
    daily_count INTEGER;
    weekly_count INTEGER;
    monthly_count INTEGER;
    all_time_count INTEGER;
BEGIN
    -- Calculate date ranges
    daily_start := CURRENT_DATE;
    weekly_start := CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::INTEGER) * INTERVAL '1 day';
    monthly_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    all_time_start := '2024-01-01'::DATE; -- Adjust as needed
    
    -- Calculate daily leaderboard
    SELECT calculate_leaderboard_cache('daily', daily_start, daily_start, 100) INTO daily_count;
    
    -- Calculate weekly leaderboard
    SELECT calculate_leaderboard_cache('weekly', weekly_start, weekly_start + INTERVAL '6 days', 100) INTO weekly_count;
    
    -- Calculate monthly leaderboard
    SELECT calculate_leaderboard_cache('monthly', monthly_start, monthly_start + INTERVAL '1 month' - INTERVAL '1 day', 100) INTO monthly_count;
    
    -- Calculate all-time leaderboard
    SELECT calculate_leaderboard_cache('all_time', all_time_start, CURRENT_DATE, 100) INTO all_time_count;
    
    -- Return results
    RETURN QUERY
    SELECT 'daily'::TEXT, daily_start, daily_count
    UNION ALL
    SELECT 'weekly'::TEXT, weekly_start, weekly_count
    UNION ALL
    SELECT 'monthly'::TEXT, monthly_start, monthly_count
    UNION ALL
    SELECT 'all_time'::TEXT, all_time_start, all_time_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old leaderboard cache entries
CREATE OR REPLACE FUNCTION cleanup_old_leaderboard_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep only last 30 days of daily, 12 weeks of weekly, 12 months of monthly, and all all-time
    DELETE FROM leaderboard_cache 
    WHERE (
        (period_type = 'daily' AND period_start < CURRENT_DATE - INTERVAL '30 days') OR
        (period_type = 'weekly' AND period_start < CURRENT_DATE - INTERVAL '12 weeks') OR
        (period_type = 'monthly' AND period_start < CURRENT_DATE - INTERVAL '12 months')
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON leaderboard_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_leaderboard_rank TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_leaderboard_cache TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_leaderboards TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_leaderboard_cache TO authenticated;

-- Grant admin permissions
GRANT ALL ON leaderboard_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_leaderboard_rank TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_leaderboard_cache TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_leaderboards TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_leaderboard_cache TO authenticated;
