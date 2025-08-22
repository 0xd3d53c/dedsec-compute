-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate code starting with 'd3d_' followed by 8 random characters
    code := 'd3d_' || upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check FROM public.users WHERE invite_code = code;
    
    -- If code doesn't exist, break the loop
    IF exists_check = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, phone, display_name, invite_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'Anonymous User'),
    generate_invite_code()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update network stats
CREATE OR REPLACE FUNCTION update_network_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats_record RECORD;
BEGIN
  -- Calculate current network statistics
  SELECT 
    COUNT(DISTINCT f.user_id) as total_followers,
    COUNT(DISTINCT CASE WHEN f.is_contributing THEN f.user_id END) as active_followers,
    COALESCE(SUM((f.device_info->>'cpu_cores')::INTEGER), 0) as total_cpu_cores,
    COALESCE(SUM((f.device_info->>'total_memory_gb')::DECIMAL), 0) as total_memory_gb,
    COALESCE(SUM(CASE WHEN f.is_contributing THEN (f.device_info->>'cpu_cores')::INTEGER * f.max_cpu_percent / 100 END), 0) as current_compute_power
  INTO stats_record
  FROM public.followers f
  WHERE f.last_seen > NOW() - INTERVAL '5 minutes';

  -- Update the network stats table
  UPDATE public.network_stats 
  SET 
    total_followers = stats_record.total_followers,
    active_followers = stats_record.active_followers,
    total_cpu_cores = stats_record.total_cpu_cores,
    total_memory_gb = stats_record.total_memory_gb,
    current_compute_power = stats_record.current_compute_power,
    operations_per_second = stats_record.current_compute_power * 10, -- Simulated ops/sec
    updated_at = NOW();
END;
$$;
