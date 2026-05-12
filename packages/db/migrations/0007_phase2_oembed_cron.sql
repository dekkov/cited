-- Phase 2 — ADMN-08 oEmbed availability cron
-- Requires Supabase: extensions pg_cron and pg_net enabled in the Supabase project settings.
--   Supabase dashboard → Database → Extensions → enable pg_cron and pg_net.
--
-- Self-host fallback: skip the pg_cron block and instead register a Vercel cron entry in
--   apps/web/vercel.json:
--   {
--     "crons": [
--       {
--         "path": "/api/cron/oembed-check",
--         "schedule": "0 4 * * *"
--       }
--     ]
--   }
--   Then add the Authorization header via the CRON_SECRET environment variable.
--   Vercel injects the env var at runtime; the route handler validates it as:
--     Authorization: Bearer <CRON_SECRET>
--
-- Secret setup (run once by database admin — do NOT hardcode the secret here):
--   ALTER DATABASE postgres SET app.cron_secret = '<your-secret>';
--   ALTER DATABASE postgres SET app.cron_base_url = 'https://<your-deploy-url>';
--
-- This stores the secret and base URL in pg_settings, available via
-- current_setting('app.cron_secret') and current_setting('app.cron_base_url').
-- The values survive restart (SET vs ALTER SESSION SET).

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    -- Unschedule any existing job with this name (idempotent)
    PERFORM cron.unschedule('check-episode-availability')
    FROM cron.job
    WHERE jobname = 'check-episode-availability';

    -- Schedule daily at 04:00 UTC
    PERFORM cron.schedule(
      'check-episode-availability',
      '0 4 * * *',
      $cron$
        SELECT net.http_post(
          url     := current_setting('app.cron_base_url', true) || '/api/cron/oembed-check',
          headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.cron_secret')
          ),
          body    := '{}'::jsonb
        );
      $cron$
    );

  END IF;
END $$;

-- Note on self-host Vercel cron alternative:
--   The Vercel cron runner calls the route with the Authorization header automatically
--   when CRON_SECRET is set as an environment variable in the Vercel project dashboard.
--   No pg_cron dependency needed; the HTTP POST is fired by Vercel's internal scheduler.
--   The route handler at apps/web/app/api/cron/oembed-check/route.ts handles both paths.
