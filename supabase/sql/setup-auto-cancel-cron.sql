-- Setup Cron Job for Auto-Cancel-Unresponsive Edge Function
-- This cron job runs the auto-cancel function every 30 minutes to check and cancel unresponsive meetings

-- NOTE: Before running this script, ensure:
-- 1. The `pg_cron` extension is enabled in Supabase
--    (Settings > Database > Extensions > Search for "cron" and enable)
-- 2. The edge function "auto-cancel-unresponsive" is deployed
-- 3. The SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set as secrets

-- Step 1: Enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Step 2: Create cron job to call the auto-cancel-unresponsive function every 30 minutes
-- The function checks for meetings that:
-- - Status is "Meet Link Generated" (no response yet)
-- - Reminder was already sent (reminder_sent = true)
-- - Meeting time is less than 12 hours away
-- - Automatically cancels and sends cancellation email

SELECT
  cron.schedule(
    'call-auto-cancel-unresponsive',                     -- Job name
    '*/30 * * * *',                                       -- Every 30 minutes
    $$
    SELECT
      net.http_post(
        url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/auto-cancel-unresponsive',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
  );

-- Step 3: View all scheduled cron jobs
-- SELECT * FROM cron.job;

-- Step 4: To unschedule/remove this job, run:
-- SELECT cron.unschedule('call-auto-cancel-unresponsive');

-- ============================================================================
-- SETUP INSTRUCTIONS:
-- ============================================================================
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Copy the entire script (excluding this comment)
-- 3. Replace 'YOUR_PROJECT_ID' with your actual Supabase project ID
--    (e.g., 'abcdefghijklmnop')
-- 4. Replace 'YOUR_ANON_KEY' with your Supabase anon key (from Settings > API)
-- 5. Run the script
-- 6. Check "View all scheduled cron jobs" to verify it was created

-- ============================================================================
-- WHAT THIS DOES:
-- ============================================================================
-- Every 30 minutes, this cron job will:
-- 1. Call the auto-cancel-unresponsive edge function
-- 2. Query all meetings with status "Meet Link Generated" where reminder_sent = true
-- 3. For meetings with < 12 hours until meeting time:
--    - Delete the calendar event from Google Calendar
--    - Update status to "Cancelled - No Response"
--    - Send cancellation email to user
--    - Send notification to admin (meeting@dataversedynamics.org)
-- 4. Log all actions in the edge function logs

-- ============================================================================
-- MONITORING:
-- ============================================================================
-- To monitor cron job execution:
-- 1. Go to Supabase Dashboard > Logs > Edge Functions
-- 2. Filter for "auto-cancel-unresponsive"
-- 3. Check execution frequency and any errors

-- ============================================================================
-- TIMING CONSIDERATIONS:
-- ============================================================================
-- Running every 30 minutes ensures:
-- - Meetings aren't auto-cancelled too early (edge cases with timezone differences)
-- - Quick response to cancellation criteria
-- - Reasonable load on the system
--
-- To adjust frequency, change '*/30 * * * *' to your preferred cron schedule:
-- '0 * * * *'     - Every hour
-- '*/15 * * * *'  - Every 15 minutes
-- '*/5 * * * *'   - Every 5 minutes (more aggressive)
-- '0 */2 * * *'   - Every 2 hours (less frequent)
