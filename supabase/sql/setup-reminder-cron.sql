-- ============================================================================
-- Setup Cron Job for Send-Reminder-Email Edge Function
-- ============================================================================
-- This script:
-- 1. Enables the pg_cron extension
-- 2. Creates a cron job that runs the send-reminder-email function every 2 hours
-- 3. The cron job will call your edge function via HTTP

-- Step 1: Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule the cron job to call the send-reminder-email edge function
-- every 2 hours (0 */2 * * *)
-- Replace YOUR_PROJECT_ID with your actual Supabase project ID
-- You can find it in your Supabase dashboard URL: https://app.supabase.com/projects/[YOUR-PROJECT-ID]

SELECT cron.schedule(
  'call-send-reminder-email',           -- Job name
  '0 */2 * * *',                        -- Every 2 hours
  'SELECT http_post(
    ''https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-reminder-email'',
    ''''::jsonb,
    ''{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb
  ) AS request_id;'
);

-- ============================================================================
-- INSTALLATION INSTRUCTIONS:
-- ============================================================================
-- 1. Open Supabase Dashboard → Your Project
-- 2. Go to SQL Editor (left sidebar)
-- 3. Click "New Query"
-- 4. Paste this entire script
-- 5. REPLACE:
--    - YOUR_PROJECT_ID with your actual project ID
--    - YOUR_SERVICE_ROLE_KEY with your Service Role Key (from Settings → API)
--       ⚠️  DO NOT COMMIT THIS KEY TO GIT - IT'S SENSITIVE
-- 6. Click "Run"
-- 7. You should see: "Query successful"
-- ============================================================================

-- Optional: View all scheduled cron jobs
-- SELECT * FROM cron.job;

-- Optional: Unschedule if needed
-- SELECT cron.unschedule('call-send-reminder-email');
