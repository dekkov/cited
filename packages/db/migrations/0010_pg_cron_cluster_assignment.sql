-- ============================================================
-- Weekly cluster reassignment via pg_cron (Plan 03-06, SWAP-02)
-- Runs Sundays at 03:00 UTC in PROD.
--
-- pg_cron is enabled in Supabase by default. The actual k-means
-- is computed in the Node.js script (scripts/run-cluster-assignment.ts)
-- which can be triggered via:
--   - A Supabase Edge Function (Phase 4)
--   - A manual run: pnpm tsx scripts/run-cluster-assignment.ts
--   - This cron job, which calls the app.cluster_assignment_url endpoint
--     (set this app-level setting in Supabase dashboard before enabling)
--
-- At MVP this job is registered but requires app.cluster_assignment_url
-- to be set before it becomes active. Document as manual step.
-- ============================================================

DO $$
BEGIN
  -- Only register if pg_cron extension is available AND the job doesn't already exist.
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'cluster-assignment-weekly'
    ) THEN
      PERFORM cron.schedule(
        'cluster-assignment-weekly',
        '0 3 * * 0',   -- Every Sunday at 03:00 UTC
        $$
          SELECT net.http_post(
            url    := current_setting('app.cluster_assignment_url', true),
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''app.cluster_assignment_secret'', true)}'::jsonb
          )
          WHERE current_setting('app.cluster_assignment_url', true) IS NOT NULL
        $$
      );
      RAISE NOTICE 'Registered cluster-assignment-weekly cron job.';
    ELSE
      RAISE NOTICE 'cluster-assignment-weekly cron job already exists — skipping.';
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron not available in this environment — skipping cluster cron registration.';
  END IF;
END;
$$;
