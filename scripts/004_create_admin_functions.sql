-- Creating admin management functions
-- Admin functions for user and system management
-- Provides secure admin operations with logging

-- Function to create default admin user
CREATE OR REPLACE FUNCTION public.create_default_admin(admin_username TEXT, admin_password TEXT)
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- This function is called by the application when first admin signs up
  -- It's not meant to create auth.users directly, but to promote existing user to admin
  
  SELECT id INTO admin_id
  FROM public.users
  WHERE username = admin_username;
  
  IF FOUND THEN
    UPDATE public.users
    SET is_admin = TRUE
    WHERE id = admin_id;
    
    -- Log admin creation
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      admin_id,
      'ADMIN_CREATED',
      'user',
      admin_id,
      json_build_object('username', admin_username)
    );
  END IF;
  
  RETURN admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ban/unban users
CREATE OR REPLACE FUNCTION public.toggle_user_status(
  admin_id UUID,
  target_user_id UUID,
  new_status BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_check BOOLEAN;
  old_status BOOLEAN;
BEGIN
  -- Verify admin privileges
  SELECT is_admin INTO is_admin_check
  FROM public.users
  WHERE id = admin_id;
  
  IF NOT is_admin_check THEN
    RETURN FALSE;
  END IF;
  
  -- Get current status
  SELECT is_active INTO old_status
  FROM public.users
  WHERE id = target_user_id;
  
  -- Update user status
  UPDATE public.users
  SET is_active = new_status
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    admin_id,
    CASE WHEN new_status THEN 'USER_UNBANNED' ELSE 'USER_BANNED' END,
    'user',
    target_user_id,
    json_build_object('old_status', old_status, 'new_status', new_status)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote/demote admin status
CREATE OR REPLACE FUNCTION public.toggle_admin_status(
  admin_id UUID,
  target_user_id UUID,
  new_admin_status BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_check BOOLEAN;
  old_admin_status BOOLEAN;
BEGIN
  -- Verify admin privileges
  SELECT is_admin INTO is_admin_check
  FROM public.users
  WHERE id = admin_id;
  
  IF NOT is_admin_check THEN
    RETURN FALSE;
  END IF;
  
  -- Prevent self-demotion
  IF admin_id = target_user_id AND NOT new_admin_status THEN
    RETURN FALSE;
  END IF;
  
  -- Get current admin status
  SELECT is_admin INTO old_admin_status
  FROM public.users
  WHERE id = target_user_id;
  
  -- Update admin status
  UPDATE public.users
  SET is_admin = new_admin_status
  WHERE id = target_user_id;
  
  -- Log the action
  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    admin_id,
    CASE WHEN new_admin_status THEN 'ADMIN_PROMOTED' ELSE 'ADMIN_DEMOTED' END,
    'user',
    target_user_id,
    json_build_object('old_status', old_admin_status, 'new_status', new_admin_status)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
