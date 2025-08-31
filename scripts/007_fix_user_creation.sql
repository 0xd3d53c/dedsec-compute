-- Fix user creation triggers and ensure proper database setup
-- This script resolves the "Database error saving new user" issue

-- First, drop any existing conflicting triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_invite_code_trigger ON public.users;

-- Drop conflicting functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_invite_code() CASCADE;
DROP FUNCTION IF EXISTS public.set_user_invite_code() CASCADE;

-- Create the proper invite code generation function
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

-- Create the proper user creation handler function
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
  
  -- Ensure username is unique by appending a number if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = username_val) LOOP
    username_val := username_val || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Insert new user with all required fields
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
    public.generate_invite_code(),
    FALSE, -- Default to non-admin
    TRUE,  -- Default to active
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Create the main trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update user updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verify the trigger is working
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created not found on auth.users';
  END IF;
  
  -- Check if function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Function handle_new_user not found in public schema';
  END IF;
  
  RAISE NOTICE 'User creation trigger setup verified successfully';
END;
$$;
