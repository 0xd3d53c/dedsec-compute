-- Functions and triggers for user management and metrics
-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous User'),
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate network metrics
CREATE OR REPLACE FUNCTION public.calculate_network_metrics()
RETURNS VOID AS $$
DECLARE
  active_count INTEGER;
  total_cores INTEGER;
  total_memory DECIMAL;
  ops_per_sec DECIMAL;
  efficiency DECIMAL;
  avg_latency INTEGER;
BEGIN
  -- Calculate active users in last 5 minutes
  SELECT COUNT(*) INTO active_count
  FROM public.user_sessions
  WHERE last_active > NOW() - INTERVAL '5 minutes';

  -- Calculate total compute resources
  SELECT 
    COALESCE(SUM((hardware_specs->>'cpu_cores')::INTEGER), 0),
    COALESCE(SUM((hardware_specs->>'total_memory_gb')::DECIMAL), 0)
  INTO total_cores, total_memory
  FROM public.user_sessions
  WHERE last_active > NOW() - INTERVAL '5 minutes'
    AND is_contributing = TRUE;

  -- Calculate operations per second (last minute)
  SELECT COALESCE(COUNT(*) / 60.0, 0) INTO ops_per_sec
  FROM public.task_executions
  WHERE completed_at > NOW() - INTERVAL '1 minute'
    AND status = 'completed';

  -- Calculate network efficiency
  SELECT COALESCE(
    (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / 
     NULLIF(COUNT(*), 0)) * 100, 0
  ) INTO efficiency
  FROM public.task_executions
  WHERE created_at > NOW() - INTERVAL '1 hour';

  -- Calculate average latency
  SELECT COALESCE(AVG(compute_time_ms), 0) INTO avg_latency
  FROM public.task_executions
  WHERE completed_at > NOW() - INTERVAL '10 minutes'
    AND status = 'completed';

  -- Insert metrics
  INSERT INTO public.network_metrics (
    active_users, total_cpu_cores, total_memory_gb, 
    operations_per_second, network_efficiency, average_latency_ms
  ) VALUES (
    active_count, total_cores, total_memory, 
    ops_per_sec, efficiency, avg_latency::INTEGER
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats
CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(CASE WHEN status = 'completed' THEN 1 END),
    'total_compute_time', COALESCE(SUM(compute_time_ms), 0),
    'success_rate', CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100
      ELSE 0 
    END,
    'followers_count', (
      SELECT COUNT(*) FROM public.followers WHERE following_id = user_uuid
    ),
    'following_count', (
      SELECT COUNT(*) FROM public.followers WHERE follower_id = user_uuid
    )
  ) INTO result
  FROM public.task_executions
  WHERE user_id = user_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
