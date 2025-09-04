-- ============================================================================
-- DEDSECCOMPUTE - MIGRATION FOR EXISTING DATABASES
-- ============================================================================
-- This script migrates existing databases to the current schema
-- ONLY run this if you have an existing database with data
-- ============================================================================

-- ============================================================================
-- 1. FIX TASK_EXECUTIONS SCHEMA
-- ============================================================================

-- Add missing columns to task_executions table
ALTER TABLE public.task_executions 
ADD COLUMN IF NOT EXISTS cpu_time_seconds NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS memory_usage_mb NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS execution_time_ms NUMERIC DEFAULT 0;

-- Update existing records to populate new columns based on compute_time_ms
UPDATE public.task_executions 
SET 
    execution_time_ms = COALESCE(compute_time_ms, 0),
    cpu_time_seconds = COALESCE(compute_time_ms::NUMERIC / 1000, 0),
    memory_usage_mb = 0  -- Default value since we don't have this data
WHERE execution_time_ms IS NULL OR execution_time_ms = 0;

-- ============================================================================
-- 2. FIX 2FA SECRET LENGTH
-- ============================================================================

-- Update the column to allow longer secrets (Speakeasy base32 secrets are typically 32+ characters)
ALTER TABLE public.users 
ALTER COLUMN two_factor_secret TYPE VARCHAR(64);

-- ============================================================================
-- 3. ADD MISSING TABLES (IF NOT EXISTS)
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
-- 4. ADD MISSING INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_task_executions_user ON public.task_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON public.task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_created_at ON public.task_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_compromise_logs_user ON public.compromise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_user ON public.worker_heartbeats(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_type_period ON public.leaderboard_cache(leaderboard_type, time_period);

-- ============================================================================
-- 5. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.compromise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for new tables
CREATE POLICY IF NOT EXISTS "compromise_logs_system" ON public.compromise_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "worker_heartbeats_own" ON public.worker_heartbeats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "leaderboard_cache_public" ON public.leaderboard_cache FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "leaderboard_cache_system" ON public.leaderboard_cache FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. UPDATE TRIGGERS
-- ============================================================================

-- Create trigger for task execution metrics if it doesn't exist
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

-- Create trigger
DROP TRIGGER IF EXISTS update_task_execution_metrics_trigger ON public.task_executions;
CREATE TRIGGER update_task_execution_metrics_trigger
    BEFORE INSERT OR UPDATE ON public.task_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_task_execution_metrics();

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

-- Verify the migration worked
DO $$
DECLARE
    task_exec_columns INTEGER;
    missing_tables INTEGER;
BEGIN
    -- Check if task_executions has the required columns
    SELECT COUNT(*) INTO task_exec_columns
    FROM information_schema.columns 
    WHERE table_name = 'task_executions' 
      AND column_name IN ('cpu_time_seconds', 'memory_usage_mb', 'execution_time_ms');
    
    -- Check if new tables exist
    SELECT COUNT(*) INTO missing_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('compromise_logs', 'worker_heartbeats', 'leaderboard_cache');
    
    IF task_exec_columns = 3 AND missing_tables = 3 THEN
        RAISE NOTICE '✅ Migration completed successfully!';
        RAISE NOTICE 'Task executions columns: %', task_exec_columns;
        RAISE NOTICE 'New tables created: %', missing_tables;
        RAISE NOTICE 'Database is now compatible with the latest application version.';
    ELSE
        RAISE WARNING '⚠️ Migration may be incomplete:';
        RAISE WARNING 'Task execution columns found: % (expected 3)', task_exec_columns;
        RAISE WARNING 'New tables found: % (expected 3)', missing_tables;
    END IF;
END;
$$;

