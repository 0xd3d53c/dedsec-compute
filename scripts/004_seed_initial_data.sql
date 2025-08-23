-- Renamed and enhanced with proper initial data seeding
-- Initial Data Seeding
-- Creates default admin user and sample achievements

-- Create default admin user (will be created when first admin signs up)
-- This is handled by the application logic, not database seeding

-- Create default achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points) VALUES
('First Steps', 'Complete your first computing task', '🚀', 'computation', 'operations_count', 1, 10),
('Computing Novice', 'Complete 100 computing operations', '💻', 'computation', 'operations_count', 100, 50),
('Computing Expert', 'Complete 1000 computing operations', '⚡', 'computation', 'operations_count', 1000, 200),
('Computing Master', 'Complete 10000 computing operations', '🔥', 'computation', 'operations_count', 10000, 500),
('Dedicated Contributor', 'Contribute 10 hours of computing time', '⏰', 'computation', 'hours_contributed', 10, 100),
('Marathon Runner', 'Contribute 100 hours of computing time', '🏃', 'computation', 'hours_contributed', 100, 300),
('Social Butterfly', 'Get 10 followers', '👥', 'social', 'followers_count', 10, 75),
('Influencer', 'Get 100 followers', '🌟', 'social', 'followers_count', 100, 250),
('Network Pioneer', 'Be among the first 100 users', '🏆', 'milestone', 'user_rank', 100, 150),
('Elite Member', 'Reach top 10 in leaderboard', '👑', 'milestone', 'user_rank', 10, 400)
ON CONFLICT (name) DO NOTHING;

-- Create sample missions for testing
INSERT INTO public.missions (title, description, mission_type, parameters, priority) VALUES
('Prime Number Search', 'Search for prime numbers in the range 1M-10M', 'prime_search', '{"start_range": 1000000, "end_range": 10000000, "batch_size": 1000}', 1),
('Matrix Multiplication', 'Perform large matrix multiplication operations', 'matrix_ops', '{"matrix_size": 1000, "operation_type": "multiply", "precision": "double"}', 2),
('Cryptographic Analysis', 'Analyze cryptographic patterns and hashes', 'crypto_analysis', '{"algorithm": "sha256", "complexity": "medium", "iterations": 10000}', 1),
('Hash Computation', 'Compute hash values for distributed verification', 'hash_computation', '{"hash_type": "blake2b", "input_size": 1024, "rounds": 1000}', 3)
ON CONFLICT DO NOTHING;

-- Update network stats initially
SELECT public.update_network_stats();
