# Troubleshooting Signup & Login Issues

## Current Problem: Infinite Recursion in RLS Policies

The error `"infinite recursion detected in policy for relation 'users'"` is preventing users from signing up and logging in properly.

## Root Cause

The Row Level Security (RLS) policies on the `users` table are causing infinite recursion because:

1. **Circular Dependencies**: Policies are trying to query the `users` table to check permissions
2. **Self-Referencing**: Admin policies reference the same table they're protecting
3. **Recursive Triggers**: Each query triggers the RLS policy, which queries the table again

## Immediate Fix (Quick Solution)

### Option 1: Temporarily Disable RLS (Recommended for Testing)

Run this script to immediately fix the issue:

```sql
-- Connect to your Supabase database and run:
\i scripts/011_temporary_rls_disable.sql
```

This will:
- ✅ Disable RLS on the users table temporarily
- ✅ Allow signup and login to work immediately
- ✅ Fix the 500 errors and infinite recursion

### Option 2: Fix RLS Policies (Permanent Solution)

After the immediate fix works, run this to restore security:

```sql
-- Connect to your Supabase database and run:
\i scripts/010_fix_rls_recursion.sql
```

Then re-enable RLS:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## Step-by-Step Resolution

### Step 1: Apply Immediate Fix
```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"

# Run the temporary fix
\i scripts/011_temporary_rls_disable.sql
```

### Step 2: Test Signup/Login
- Try creating a new user account
- Try logging in with existing credentials
- Verify redirects work properly

### Step 3: Apply Permanent Fix
```sql
# Run the RLS fix script
\i scripts/010_fix_rls_recursion.sql

# Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### Step 4: Verify Security
```sql
# Run the verification script
\i scripts/009_verify_database_setup.sql
```

## What Each Script Does

### `scripts/011_temporary_rls_disable.sql`
- Temporarily disables RLS on users table
- Allows immediate access without recursion
- **WARNING**: Reduces security temporarily

### `scripts/010_fix_rls_recursion.sql`
- Drops all problematic RLS policies
- Creates new, non-recursive policies
- Uses `auth.role()` instead of self-referencing queries

### `scripts/009_verify_database_setup.sql`
- Checks database structure
- Verifies triggers and functions
- Tests RLS policies

## Expected Results

### After Temporary Fix:
- ✅ Signup works without database errors
- ✅ Login works and redirects properly
- ✅ No more 500 errors on user queries
- ✅ Users can access their profiles

### After Permanent Fix:
- ✅ All security restored
- ✅ RLS policies working without recursion
- ✅ Proper access control maintained
- ✅ System fully functional and secure

## Alternative Solutions

### Option 3: Manual Policy Fix
If you prefer to fix manually:

```sql
-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Create simple, non-recursive policies
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = user_id);
```

### Option 4: Disable RLS Completely (Not Recommended)
```sql
-- Only use for development/testing
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

## Verification Steps

After applying fixes, verify:

1. **Signup Works**:
   - Create new account
   - Check console for success messages
   - Verify redirect to consent/dashboard

2. **Login Works**:
   - Sign in with credentials
   - Check console for profile fetch success
   - Verify redirect to dashboard

3. **Database Access**:
   - Run verification script
   - Check for any remaining errors
   - Verify user data is accessible

## Common Issues & Solutions

### Issue: Still getting 500 errors
**Solution**: Check if RLS is actually disabled:
```sql
SELECT rowsecurity FROM pg_tables WHERE tablename = 'users';
```

### Issue: Users can't access their own data
**Solution**: Verify the trigger is working:
```sql
SELECT * FROM public.users WHERE email = 'user@example.com';
```

### Issue: Admin functions not working
**Solution**: Check service role permissions:
```sql
SELECT current_user, current_setting('role');
```

## Security Considerations

### Temporary RLS Disable:
- ⚠️ **Reduces security** - users can see all user data
- ⚠️ **Only use for testing** - not production
- ⚠️ **Re-enable ASAP** after fixing policies

### Permanent RLS Fix:
- ✅ **Restores security** with proper policies
- ✅ **No recursion** issues
- ✅ **Proper access control** maintained
- ✅ **Production ready**

## Next Steps

1. **Immediate**: Run `scripts/011_temporary_rls_disable.sql`
2. **Test**: Verify signup/login works
3. **Fix**: Run `scripts/010_fix_rls_recursion.sql`
4. **Secure**: Re-enable RLS
5. **Verify**: Run `scripts/009_verify_database_setup.sql`

## Support

If you continue to have issues:

1. Check Supabase logs for specific error messages
2. Verify database connection and permissions
3. Check if all scripts ran successfully
4. Ensure no conflicting policies remain

The temporary fix should resolve your immediate signup/login issues, and the permanent fix will restore proper security without recursion problems.
