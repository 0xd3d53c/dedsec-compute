-- Renamed and enhanced with proper initial data seeding
-- Initial Data Seeding
-- Creates default admin user and sample achievements

-- Create default admin user (will be created when first admin signs up)
-- This is handled by the application logic, not database seeding

-- Create default achievements (these are already in the main schema, but adding more for testing)
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, points) VALUES
('First Steps', 'Complete your first computing task', '🚀', 'tasks_completed', 1, 10),
('Computing Novice', 'Complete 100 computing operations', '💻', 'tasks_completed', 100, 50),
('Computing Expert', 'Complete 1000 computing operations', '⚡', 'tasks_completed', 1000, 200),
('Computing Master', 'Complete 10000 computing operations', '🔥', 'tasks_completed', 10000, 500),
('Dedicated Contributor', 'Contribute 10 hours of computing time', '⏰', 'compute_hours', 10, 100),
('Marathon Runner', 'Contribute 100 hours of computing time', '🏃', 'compute_hours', 100, 300),
('Social Butterfly', 'Get 10 followers', '👥', 'followers_count', 10, 75),
('Influencer', 'Get 100 followers', '🌟', 'followers_count', 100, 250),
('Network Pioneer', 'Be among the first 100 users', '🏆', 'user_rank', 100, 150),
('Elite Member', 'Reach top 10 in leaderboard', '👑', 'user_rank', 10, 400)
ON CONFLICT (name) DO NOTHING;

-- Create sample operations for testing (these are already in the main schema, but adding more for testing)
INSERT INTO public.operations (name, description, required_compute_power, task_signature, task_hash, unlock_threshold, parameters)
VALUES 
('OPERATION_PRIME_SEARCH_EXTENDED', 'Search for prime numbers in extended ranges', '150', 
 'sig_prime_extended_v1_2024', 'hash_prime_extended_v1_2024', '75',
 '{"algorithm": "sieve_eratosthenes", "range_size": 2000000, "target_primes": 200}'),
('OPERATION_MATRIX_EXTENDED', 'Perform extended matrix operations', '800',
 'sig_matrix_extended_v1_2024', 'hash_matrix_extended_v1_2024', '400',
 '{"matrix_size": 2000, "precision": "float64", "operations": ["multiply", "transpose", "inverse"]}')
ON CONFLICT DO NOTHING;

-- Update network metrics initially
SELECT public.update_network_metrics();
