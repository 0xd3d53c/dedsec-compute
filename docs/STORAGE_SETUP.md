# Supabase Storage Setup Guide

This guide explains how to set up the required storage bucket for profile pictures in your DedSecCompute project.

## 🚨 Current Issue
The error "Profile pictures storage bucket not found" occurs because the `profile-pictures` storage bucket hasn't been created in your Supabase project.

## 🔧 Solution: Create Storage Bucket

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to Storage**
   - Click on **Storage** in the left sidebar
   - Click **Create a new bucket**

3. **Configure the Bucket**
   - **Name**: `profile-pictures` (exactly as shown)
   - **Public bucket**: ✅ Check this (allows public access to profile pictures)
   - **File size limit**: `4 MB` (4,194,304 bytes)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg` 
     - `image/png`
     - `image/webp`

4. **Create Bucket**
   - Click **Create bucket**

### Option 2: Programmatic Creation

If you have admin privileges, you can create the bucket programmatically:

```typescript
import { ensureProfilePicturesBucket } from '@/lib/profile-utils'

// This will attempt to create the bucket if it doesn't exist
const result = await ensureProfilePicturesBucket()
if (!result.success) {
  console.error('Failed to create bucket:', result.error)
}
```

### Option 3: SQL Script (Advanced)

Run the SQL script in your Supabase SQL editor:

```sql
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
```

## 🔒 RLS Policies Setup

After creating the bucket, you need to set up Row Level Security (RLS) policies:

1. **Go to Storage > Policies**
2. **Click on the `profile-pictures` bucket**
3. **Add these policies:**

### Policy 1: Users can upload their own profile pictures
```sql
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 2: Users can update their own profile pictures
```sql
CREATE POLICY "Users can update their own profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 3: Users can delete their own profile pictures
```sql
CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Policy 4: Anyone can view profile pictures
```sql
CREATE POLICY "Anyone can view profile pictures" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');
```

## ✅ Verification

After setup, verify the bucket exists:

1. **Check Storage section** - you should see `profile-pictures` bucket
2. **Test upload** - try uploading a profile picture in the app
3. **Check console** - no more "bucket not found" errors

## 🐛 Troubleshooting

### "Bucket already exists" error
- The bucket was already created, you can skip this step

### "Permission denied" error
- You need admin privileges to create buckets
- Use the dashboard method instead

### "RLS policy error"
- Make sure you're logged in as an admin user
- Check that the policies are created correctly

### Still getting errors?
1. Check the browser console for detailed error messages
2. Verify the bucket name is exactly `profile-pictures`
3. Ensure the bucket is set to public
4. Check that RLS policies are properly configured

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security)
- [File Upload Examples](https://supabase.com/docs/guides/storage/upload)

## 🆘 Need Help?

If you're still experiencing issues:
1. Check the error message in the browser console
2. Verify your Supabase project settings
3. Contact support with the specific error message
