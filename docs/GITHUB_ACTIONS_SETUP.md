# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions for automated database maintenance in your DedSecCompute project.

## 🔧 Required Secrets

You need to add the following secrets to your GitHub repository:

### 1. SUPABASE_URL
- **Value**: Your Supabase project URL
- **Format**: `https://your-project-id.supabase.co`
- **Example**: `https://abcdefghijklmnop.supabase.co`

### 2. SUPABASE_ANON_KEY
- **Value**: Your Supabase anonymous/public key
- **Format**: A long string starting with `eyJ...`
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 📋 How to Add Secrets

### Step 1: Go to Repository Settings
1. Navigate to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Repository Secrets
1. Click **New repository secret**
2. Enter the secret name (e.g., `SUPABASE_URL`)
3. Enter the secret value
4. Click **Add secret**
5. Repeat for `SUPABASE_ANON_KEY`

### Step 3: Verify Secrets
1. Go to **Actions** tab
2. Click on **Database Maintenance** workflow
3. Click **Run workflow** → **Run workflow**
4. Check the logs to ensure secrets are properly configured

## 🔍 Finding Your Supabase Credentials

### SUPABASE_URL
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL**

### SUPABASE_ANON_KEY
1. In the same **Settings** → **API** page
2. Copy the **anon/public** key (not the service_role key)

## 🚨 Security Notes

- **Never commit secrets to your repository**
- **Use repository secrets, not environment variables**
- **The anon key is safe to use in GitHub Actions** (it's designed for client-side use)
- **Don't use the service_role key** (it has admin privileges)

## 🔄 Workflow Schedule

The maintenance workflow runs:
- **Daily at 1 AM UTC** (automatically)
- **Manually** (via GitHub Actions UI)

## 📊 What the Workflow Does

1. **Validates environment variables** are set
2. **Calls `scheduled_maintenance()`** function in Supabase
3. **Updates leaderboards** (daily, weekly, monthly, all-time)
4. **Cleans up old data** (heartbeats, logs, cache)
5. **Checks maintenance health** and reports status

## 🐛 Troubleshooting

### Error: "URL rejected: No host part in the URL"
- **Cause**: `SUPABASE_URL` secret is not set or empty
- **Solution**: Add the `SUPABASE_URL` secret to your repository

### Error: "401 Unauthorized"
- **Cause**: `SUPABASE_ANON_KEY` is incorrect or missing
- **Solution**: Verify and update the `SUPABASE_ANON_KEY` secret

### Error: "404 Not Found"
- **Cause**: Supabase project URL is incorrect
- **Solution**: Verify the `SUPABASE_URL` secret matches your project

### Error: "Function not found"
- **Cause**: Database functions not created
- **Solution**: Run the SQL migration scripts in Supabase

## 📝 Manual Testing

You can test the maintenance function manually:

```bash
# Replace with your actual values
curl -X POST "https://your-project.supabase.co/rest/v1/rpc/scheduled_maintenance" \
     -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key" \
     -H "Content-Type: application/json"
```

## 🔗 Related Documentation

- [External Scheduling Guide](EXTERNAL_SCHEDULING.md)
- [Database Schema](../scripts/)
- [Supabase Documentation](https://supabase.com/docs)

## 💡 Tips

- **Monitor the Actions tab** for workflow status
- **Check logs** if workflows fail
- **Test manually** before relying on automation
- **Keep secrets updated** if you rotate keys
