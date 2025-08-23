-- Insert initial network stats
INSERT INTO public.network_stats (total_users, active_nodes, total_computing_power, operations_per_second)
VALUES (0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Insert sample computing missions
INSERT INTO public.computing_missions (title, description, mission_type, target_operations, reward_points)
VALUES 
  ('Prime Number Discovery', 'Help discover large prime numbers for cryptographic research', 'prime_calculation', 1000000, 100),
  ('Matrix Multiplication', 'Perform complex matrix operations for scientific computing', 'matrix_operations', 500000, 75),
  ('Hash Computation', 'Calculate cryptographic hashes for blockchain verification', 'hashing', 2000000, 150)
ON CONFLICT DO NOTHING;
