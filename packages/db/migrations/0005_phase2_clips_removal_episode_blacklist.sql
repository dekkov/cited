-- Phase 2 — clip removal columns (GA6) + episode_blacklist (LGL-03) + oembed counter (Pitfall 6)
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS removed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS removal_reason    text,
  ADD COLUMN IF NOT EXISTS removal_notes     text,
  ADD COLUMN IF NOT EXISTS takedown_ref_url  text;

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS source_unavailable_at timestamptz,
  ADD COLUMN IF NOT EXISTS oembed_404_count      integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.episode_blacklist (
  youtube_video_id text PRIMARY KEY,
  reason           text NOT NULL CHECK (reason IN ('dmca','speaker-request','medical-risk','other')),
  notes            text,
  takedown_ref_url text,
  blacklisted_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.episode_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS episode_blacklist_curator_all ON public.episode_blacklist;
CREATE POLICY episode_blacklist_curator_all ON public.episode_blacklist
  FOR ALL
  USING (public.is_curator_or_admin())
  WITH CHECK (public.is_curator_or_admin());
