-- Creating production data seeding
-- Production data seeding
-- Creates initial admin user and sample data for testing

-- Create sample network metrics entry
INSERT INTO public.network_metrics (
  active_users, total_cpu_cores, total_memory_gb, 
  operations_per_second, network_efficiency, average_latency_ms
) VALUES (0, 0, 0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Create sample operations for immediate testing
INSERT INTO public.operations (
  name, description, required_compute_power, task_signature, task_hash, unlock_threshold, parameters
) VALUES (
  'OPERATION_FIBONACCI',
  'Calculate Fibonacci sequences for mathematical verification',
  50,
  'sig_fib_' || substr(md5(random()::text), 1, 32),
  'hash_fibonacci_v1_' || extract(epoch from now())::text,
  10,
  '{"sequence_length": 1000, "verification_required": true}'
) ON CONFLICT DO NOTHING;

-- Function to initialize network stats
CREATE OR REPLACE FUNCTION public.initialize_network_stats()
RETURNS VOID AS $$
BEGIN
  -- Only insert if no metrics exist
  IF NOT EXISTS (SELECT 1 FROM public.network_metrics LIMIT 1) THEN
    INSERT INTO public.network_metrics (
      active_users, total_cpu_cores, total_memory_gb, 
      operations_per_second, network_efficiency, average_latency_ms
    ) VALUES (0, 0, 0, 0, 0, 0);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Initialize network stats
SELECT public.initialize_network_stats();
