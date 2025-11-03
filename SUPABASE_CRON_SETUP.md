# Supabase Cron Setup for Daily Email Notifications

This guide explains how to set up daily email notifications using Supabase's `pg_cron` extension.

## Why Supabase Cron?

✅ **Works on localhost** - Can test locally with your Supabase project
✅ **No deployment needed** - Works immediately with your Supabase database
✅ **Built-in monitoring** - View job history directly in Supabase
✅ **PostgreSQL native** - Uses PostgreSQL's `pg_cron` extension

## Prerequisites

1. Supabase project (you already have this)
2. Your Next.js app deployed and accessible via URL
3. The email cron endpoint created at `/api/cron/daily-email-summary`

## Setup Steps

### Step 1: Enable Required Extensions

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Create the Cron Job

Replace `https://your-app.vercel.app` with your actual deployed URL:

```sql
-- Schedule daily email summary at 8:00 AM SGT (midnight UTC)
SELECT cron.schedule(
  'daily-email-summary-8am-sgt',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-app.vercel.app/api/cron/daily-email-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

### Step 3: Add Cron Secret (Optional but Recommended)

If you want to protect the endpoint with a secret:

```sql
-- Update the cron job with authorization header
SELECT cron.unschedule('daily-email-summary-8am-sgt');

SELECT cron.schedule(
  'daily-email-summary-8am-sgt',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-app.vercel.app/api/cron/daily-email-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET_HERE'
    )
  ) AS request_id;
  $$
);
```

## Time Zone Configuration

**Important**: PostgreSQL `pg_cron` uses UTC time by default.

- **8:00 AM SGT** = **00:00 UTC** (midnight UTC)
- **SGT is UTC+8**

The cron expression `0 0 * * *` means:
- Minute: 0
- Hour: 0 (midnight UTC)
- Day of month: * (every day)
- Month: * (every month)
- Day of week: * (every day of week)

### Common Time Conversions

| SGT Time | UTC Time | Cron Expression |
|----------|----------|-----------------|
| 8:00 AM  | 00:00    | `0 0 * * *`     |
| 9:00 AM  | 01:00    | `0 1 * * *`     |
| 10:00 AM | 02:00    | `0 2 * * *`     |
| 6:00 AM  | 22:00 (prev day) | `0 22 * * *` |

## Managing Cron Jobs

### View All Scheduled Jobs

```sql
SELECT * FROM cron.job;
```

### View Job Run History

```sql
SELECT
  job_id,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### Unschedule a Job

```sql
SELECT cron.unschedule('daily-email-summary-8am-sgt');
```

### Update a Job Schedule

To change the schedule:

```sql
-- First unschedule the old job
SELECT cron.unschedule('daily-email-summary-8am-sgt');

-- Then create a new one with different timing
SELECT cron.schedule(
  'daily-email-summary-8am-sgt',
  '0 1 * * *',  -- New time: 9:00 AM SGT (01:00 UTC)
  $$
  SELECT net.http_post(
    url := 'https://your-app.vercel.app/api/cron/daily-email-summary',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);
```

## Testing

### Test the HTTP Request

You can test if the HTTP request works:

```sql
SELECT net.http_post(
  url := 'https://your-app.vercel.app/api/cron/daily-email-summary',
  headers := '{"Content-Type": "application/json"}'::jsonb
) AS request_id;
```

### Check the Response

```sql
-- Get the response from the last request
SELECT * FROM net._http_response
ORDER BY id DESC
LIMIT 1;
```

### Manual Trigger for Testing

You can manually trigger the job for testing:

```sql
-- Run the same command that the cron job will execute
SELECT net.http_post(
  url := 'http://localhost:3000/api/cron/daily-email-summary',
  headers := '{"Content-Type": "application/json"}'::jsonb
) AS request_id;
```

**Note**: For local testing, use `http://localhost:3000`. The Supabase cron can reach your local machine if you expose it using a tunnel like ngrok.

## Local Development Testing

### Option 1: Use ngrok (Recommended)

1. Install ngrok: `npm install -g ngrok`
2. Start your Next.js dev server: `npm run dev`
3. Create a tunnel: `ngrok http 3000`
4. Use the ngrok URL in your cron job

```sql
SELECT net.http_post(
  url := 'https://your-ngrok-url.ngrok.io/api/cron/daily-email-summary',
  headers := '{"Content-Type": "application/json"}'::jsonb
) AS request_id;
```

### Option 2: Test Directly in Code

You can also test the email sending function directly without HTTP:

```typescript
// In your Next.js app
import { sendTaskEmails } from '@/app/api/emails/route';

// Test reminder emails
await sendTaskEmails('reminder');

// Test overdue emails
await sendTaskEmails('overdue');

// Test daily summary
await sendTaskEmails('dailySummary');
```

## Monitoring and Debugging

### Check if Job is Running

```sql
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'daily-email-summary-8am-sgt';
```

### View Recent Runs

```sql
SELECT
  j.jobname,
  jr.job_id,
  jr.status,
  jr.return_message,
  jr.start_time,
  jr.end_time,
  jr.end_time - jr.start_time AS duration
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.job_id
WHERE j.jobname = 'daily-email-summary-8am-sgt'
ORDER BY jr.start_time DESC
LIMIT 10;
```

### Check HTTP Response

```sql
SELECT
  id,
  status_code,
  content,
  created_at
FROM net._http_response
ORDER BY created_at DESC
LIMIT 5;
```

## Troubleshooting

### Job Not Running

1. **Check if extension is enabled**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check if job is active**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'daily-email-summary-8am-sgt';
   ```

3. **Check for errors in job history**:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE status = 'failed'
   ORDER BY start_time DESC;
   ```

### HTTP Request Failing

1. **Verify the URL is correct and accessible**
2. **Check if your app is deployed and running**
3. **Test the endpoint manually**: `curl https://your-app.vercel.app/api/cron/daily-email-summary`
4. **Check Supabase logs**: Dashboard → Logs → Postgres Logs

### Emails Not Sending

1. **Check email service credentials** in `.env.local`
2. **Verify Gmail app password** is correct
3. **Check application logs** for email sending errors
4. **Test the endpoint directly** via browser or curl

## Security Best Practices

1. ✅ **Use CRON_SECRET**: Add Authorization header with a secret token
2. ✅ **Restrict endpoint access**: Only allow requests from Supabase IP ranges (if possible)
3. ✅ **Monitor job runs**: Regularly check `cron.job_run_details` for failures
4. ✅ **Use environment variables**: Don't hardcode secrets in SQL
5. ✅ **Enable RLS**: Ensure Row Level Security is enabled on sensitive tables

## Comparison: Supabase Cron vs Vercel Cron

| Feature | Supabase pg_cron | Vercel Cron |
|---------|------------------|-------------|
| **Local Testing** | ✅ Yes (with ngrok) | ❌ No |
| **Setup Complexity** | Medium (SQL) | Easy (JSON config) |
| **Monitoring** | ✅ Built-in (SQL queries) | ✅ Dashboard |
| **Cost** | Free (included) | Free (hobby tier) |
| **Flexibility** | High (SQL) | Medium (JSON) |
| **Reliability** | High | High |

## Additional Resources

- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [PostgreSQL Cron Syntax](https://crontab.guru/)
- [Supabase pg_net Extension](https://supabase.com/docs/guides/database/extensions/pg_net)

## Quick Reference Commands

```sql
-- List all cron jobs
SELECT * FROM cron.job;

-- View recent runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule a job
SELECT cron.unschedule('daily-email-summary-8am-sgt');

-- Test HTTP request
SELECT net.http_post(
  url := 'https://your-app.vercel.app/api/cron/daily-email-summary',
  headers := '{"Content-Type": "application/json"}'::jsonb
);

-- Check HTTP responses
SELECT * FROM net._http_response ORDER BY created_at DESC LIMIT 5;
```
