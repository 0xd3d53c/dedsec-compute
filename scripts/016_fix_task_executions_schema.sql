-- Fix task_executions table schema to match RPC function expectations
-- This script adds missing columns and updates the table structure

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
WHERE execution_time_ms IS NULL;

-- Create a trigger to auto-populate these values for new records
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.task_executions TO authenticated;
