-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val TEXT;
  display_name_val TEXT;
  email_val TEXT;
  invite_code_val TEXT;
BEGIN
  -- Extract values from user metadata or use defaults
  username_val := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  display_name_val := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    'Anonymous User'
  );
  
  email_val := COALESCE(
    NEW.raw_user_meta_data ->> 'email',
    NEW.email
  );
  
  -- Generate unique invite code
  invite_code_val := public.generate_invite_code();
  
  -- Ensure username is unique by appending a number if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = username_val) LOOP
    username_val := username_val || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Insert new user with all required fields
  -- Use ON CONFLICT DO NOTHING to avoid errors if user already exists
  INSERT INTO public.users (
    id, 
    username, 
    display_name, 
    email, 
    invite_code,
    is_admin,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    username_val,
    display_name_val,
    email_val,
    invite_code_val,
    FALSE, -- Default to non-admin
    TRUE,  -- Default to active
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Also create a user_sessions record for the new user
  INSERT INTO public.user_sessions (
    user_id,
    device_id,
    hardware_specs,
    is_contributing,
    max_cpu_percent,
    max_memory_mb,
    only_when_charging,
    only_when_idle,
    last_active,
    created_at
  )
  VALUES (
    NEW.id,
    'web_' || substr(NEW.id::text, 1, 8),
    jsonb_build_object(
      'cpu_cores', 1,
      'total_memory_gb', 1.0,
      'architecture', 'web',
      'platform', 'browser'
    ),
    FALSE,
    25,
    512,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update network metrics
CREATE OR REPLACE FUNCTION public.update_network_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metrics_record RECORD;
BEGIN
  -- Calculate current network statistics
  SELECT 
    COUNT(DISTINCT us.user_id) as active_users,
    COALESCE(SUM((us.hardware_specs->>'cpu_cores')::INTEGER), 0) as total_cpu_cores,
    COALESCE(SUM((us.hardware_specs->>'total_memory_gb')::DECIMAL), 0) as total_memory_gb,
    COALESCE(SUM(CASE WHEN us.is_contributing THEN us.max_cpu_percent END), 0) as current_compute_power
  INTO metrics_record
  FROM public.user_sessions us
  WHERE us.last_active > NOW() - INTERVAL '5 minutes';

  -- Insert new metrics record
  INSERT INTO public.network_metrics (
    active_users, 
    total_cpu_cores, 
    total_memory_gb, 
    operations_per_second, 
    network_efficiency, 
    average_latency_ms
  ) VALUES (
    metrics_record.active_users,
    metrics_record.total_cpu_cores,
    metrics_record.total_memory_gb,
    COALESCE(metrics_record.current_compute_power * 0.1, 0), -- Simulated ops/sec
    95.0, -- Default efficiency
    150 -- Default latency in ms
  );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_network_metrics() TO authenticated;
