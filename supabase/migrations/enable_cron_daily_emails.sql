-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function that calls the email endpoint
CREATE OR REPLACE FUNCTION trigger_daily_email_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url TEXT;
  cron_secret TEXT;
  response TEXT;
BEGIN
  -- Get the API URL from environment or use default
  -- Replace with your actual deployed URL
  api_url := current_setting('app.settings.api_url', true);

  IF api_url IS NULL OR api_url = '' THEN
    -- Default to production URL (update this with your actual URL)
    api_url := 'https://your-app.vercel.app';
  END IF;

  -- Get the CRON_SECRET if set
  cron_secret := current_setting('app.settings.cron_secret', true);

  -- Make HTTP request to the endpoint using http extension
  -- Note: Requires pg_net or http extension
  PERFORM
    net.http_post(
      url := api_url || '/api/cron/daily-email-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(cron_secret, '')
      )
    );

  RAISE NOTICE 'Daily email summary triggered at %', NOW();
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to trigger daily email summary: %', SQLERRM;
END;
$$;

-- Schedule the cron job to run daily at 8:00 AM SGT (00:00 UTC)
-- SGT is UTC+8, so 8:00 AM SGT = 00:00 UTC
SELECT cron.schedule(
  'daily-email-summary-8am-sgt',  -- Job name
  '0 0 * * *',                     -- Cron expression: 00:00 UTC daily (8:00 AM SGT)
  'SELECT trigger_daily_email_summary();'
);

-- Alternative: If you want to use Supabase's built-in net.http_post directly
-- You can also schedule it like this:
/*
SELECT cron.schedule(
  'daily-email-summary-direct',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-app.vercel.app/api/cron/daily-email-summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
  $$
);
*/

-- View scheduled cron jobs
-- SELECT * FROM cron.job;

-- View cron job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
