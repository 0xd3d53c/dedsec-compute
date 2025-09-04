-- ============================================================================
-- DEDSECCOMPUTE - STORAGE SETUP
-- ============================================================================
-- This script sets up Supabase storage buckets and policies
-- Run this AFTER the main database setup
-- ============================================================================

-- Create the profile-pictures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  4194304, -- 4MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Set up RLS policies for the profile-pictures bucket
CREATE POLICY IF NOT EXISTS "Users can upload their own profile pictures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can update their own profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can delete their own profile pictures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Anyone can view profile pictures" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-pictures') THEN
    RAISE NOTICE '✅ Storage setup completed successfully!';
    RAISE NOTICE 'Profile pictures bucket created with 4MB limit';
    RAISE NOTICE 'Allowed file types: JPG, PNG, WebP';
  ELSE
    RAISE EXCEPTION '❌ Storage setup failed - bucket not created';
  END IF;
END;
$$;

