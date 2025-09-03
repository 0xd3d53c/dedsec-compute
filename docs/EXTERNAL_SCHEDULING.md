# External Scheduling Setup

Since Supabase hosted doesn't support `pg_cron`, we use external scheduling to trigger database maintenance tasks.

## Available Options

### 1. GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow that runs daily at 1 AM UTC.

**Setup:**
1. Go to your repository's Settings → Secrets and variables → Actions
2. Add these secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key

**Manual Trigger:**
- Go to Actions tab → Database Maintenance → Run workflow

### 2. Vercel Cron Jobs

If deploying on Vercel, the cron job is automatically configured.

**Setup:**
1. Add environment variable `CRON_SECRET` in Vercel dashboard
2. The cron job will run daily at 1 AM UTC

**Manual Trigger:**
```bash
curl -X POST "https://your-app.vercel.app/api/cron/maintenance" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. External Server/Cron

Set up a server with a cron job to call the maintenance function:

```bash
# Add to crontab (crontab -e)
0 1 * * * curl -X POST "https://your-project.supabase.co/rest/v1/rpc/scheduled_maintenance" \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json"
```

### 4. Manual Execution

Run the maintenance function manually in Supabase SQL Editor:

```sql
SELECT * FROM scheduled_maintenance();
```

## What Gets Maintained

The `scheduled_maintenance()` function performs:

1. **Leaderboard Updates**: Calculates daily, weekly, monthly, and all-time leaderboards
2. **Cache Cleanup**: Removes old leaderboard cache entries
3. **Heartbeat Cleanup**: Removes old worker heartbeat records
4. **Log Cleanup**: Removes old compromise logs (if implemented)

## Monitoring

Check maintenance health using the `cron_job_health` view:

```sql
SELECT * FROM cron_job_health;
```

This shows the status of various maintenance tasks and when they were last updated.

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure your API keys are correct
2. **Permission Errors**: Make sure the function has proper RLS policies
3. **Timeout Errors**: The maintenance function may take time for large datasets

### Manual Recovery

If automated maintenance fails, you can run individual functions:

```sql
-- Update leaderboards only
SELECT * FROM update_all_leaderboards();

-- Cleanup old data only
SELECT cleanup_old_leaderboard_cache();
SELECT cleanup_old_heartbeats();
```

## Security Notes

- Keep your API keys secure
- Use environment variables for sensitive data
- Consider IP whitelisting for external cron servers
- Monitor maintenance logs for any issues
