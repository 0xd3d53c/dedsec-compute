-- Creating invite system functions and triggers
-- Invite system functions for user recruitment
-- Handles invite code generation and validation

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.users 
    WHERE invite_code = code;
    
    -- If unique, exit loop
    IF exists_check = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle invite code redemption
CREATE OR REPLACE FUNCTION public.redeem_invite_code(code TEXT, new_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  inviter_id UUID;
  code_exists BOOLEAN;
BEGIN
  -- Check if invite code exists and get inviter
  SELECT id INTO inviter_id
  FROM public.users
  WHERE invite_code = code;
  
  code_exists := FOUND;
  
  IF code_exists AND inviter_id != new_user_id THEN
    -- Update the new user with inviter reference
    UPDATE public.users
    SET invited_by = inviter_id
    WHERE id = new_user_id;
    
    -- Log the successful invite redemption
    INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      inviter_id,
      'INVITE_REDEEMED',
      'user',
      new_user_id,
      json_build_object('invite_code', code)
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to generate invite code for new users
CREATE OR REPLACE FUNCTION public.set_user_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invite_code_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_user_invite_code();
