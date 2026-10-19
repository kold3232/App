-- Schedules the nudge job.
--
-- Not part of schema.sql on purpose: it carries a key and a project reference,
-- so it is run once by hand per environment rather than pasted along with the
-- schema.
--
-- Before running this:
--   1. Deploy the function:  npx supabase functions deploy nudge-stale-requests
--   2. Replace <PROJECT_REF> below with your project ref (the subdomain of
--      your Supabase API URL).
--   3. Replace <SERVICE_ROLE_KEY> with the service role key from
--      Supabase → Project Settings → API. The function refuses any other
--      caller, so nothing else can fire it.
--
-- Hourly is plenty: the job only ever nudges a request once, so running it
-- more often changes nothing except how soon the first reminder lands. Minute
-- 17 rather than 0 to stay out of the way of everything else that runs on the
-- hour.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'nudge-stale-requests',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/nudge-stale-requests',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Useful afterwards:
--   select * from cron.job;                          -- is it scheduled
--   select * from cron.job_run_details
--     order by start_time desc limit 10;             -- did it run, and what happened
--   select cron.unschedule('nudge-stale-requests');  -- turn it off
--
-- To change how long a request may sit before the nudge, set NUDGE_AFTER_HOURS
-- as a function secret (default 24):
--   npx supabase secrets set NUDGE_AFTER_HOURS=12
