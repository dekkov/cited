-- Phase 2 — dev-only AION-10 fixture candidate staging table
CREATE TABLE IF NOT EXISTS public.aion10_fixture_candidates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id           uuid REFERENCES public.clips(id) ON DELETE CASCADE,
  kind              text NOT NULL CHECK (kind IN ('suggest-start-end','refine-claim','propose-alternative')),
  ai_input          jsonb NOT NULL,
  ai_output         jsonb NOT NULL,
  expected_grounded boolean,
  reviewer_notes    text,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aion10_fixture_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aion10_fixture_candidates_curator_all ON public.aion10_fixture_candidates;
CREATE POLICY aion10_fixture_candidates_curator_all ON public.aion10_fixture_candidates
  FOR ALL
  USING (public.is_curator_or_admin())
  WITH CHECK (public.is_curator_or_admin());
