-- Insert initial network metrics
INSERT INTO public.network_metrics (active_users, total_cpu_cores, total_memory_gb, operations_per_second, network_efficiency, average_latency_ms)
VALUES (0, 0, 0.0, 0.0, 0.0, 0)
ON CONFLICT DO NOTHING;

-- Insert sample operations (these are already in the main schema, but adding more for testing)
INSERT INTO public.operations (name, description, required_compute_power, task_signature, task_hash, unlock_threshold, parameters)
VALUES 
  ('OPERATION_FIBONACCI', 'Calculate Fibonacci sequences for mathematical research', 200, 
   'sig_fibonacci_v1_2024', 'hash_fibonacci_v1_2024', 100,
   '{"algorithm": "fibonacci", "sequence_length": 1000000, "precision": "bigint"}'),
  ('OPERATION_FACTORIAL', 'Compute large factorials for mathematical analysis', 300,
   'sig_factorial_v1_2024', 'hash_factorial_v1_2024', 150,
   '{"algorithm": "factorial", "max_number": 10000, "precision": "bigint"}')
ON CONFLICT DO NOTHING;
