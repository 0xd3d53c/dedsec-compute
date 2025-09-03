-- Fix 2FA secret length issue
-- The two_factor_secret field needs to be longer to accommodate Speakeasy secrets

-- Update the column to allow longer secrets (Speakeasy base32 secrets are typically 32+ characters)
ALTER TABLE public.users 
ALTER COLUMN two_factor_secret TYPE VARCHAR(64);

-- Add a comment to document the change
COMMENT ON COLUMN public.users.two_factor_secret IS 'Base32 encoded TOTP secret for 2FA authentication';
