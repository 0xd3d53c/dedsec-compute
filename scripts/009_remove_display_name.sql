-- Remove display_name column and use only username
-- This script removes the display_name column from the users table

-- Remove the display_name column
ALTER TABLE public.users DROP COLUMN IF EXISTS display_name;

-- Update the handle_new_user function to not use display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val TEXT;
  email_val TEXT;
BEGIN
  -- Extract values from user metadata or use defaults
  username_val := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    'user_' || substr(NEW.id::text, 1, 8)
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
    email_val,
    public.generate_invite_code(),
    FALSE, -- Default to non-admin
    TRUE,  -- Default to active
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;
