-- Phase 2 — transcripts table with tsvector + GIN index (GA4)
CREATE TABLE IF NOT EXISTS public.transcripts (
  video_id    text PRIMARY KEY,
  source      text NOT NULL CHECK (source IN ('youtube_captions','deepgram','manual')),
  segments    jsonb NOT NULL,
  raw_text    text NOT NULL,
  language    text NOT NULL DEFAULT 'en',
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', raw_text)) STORED
);

-- FK to episodes.youtube_video_id (unique in Phase 1)
DO $$ BEGIN
  ALTER TABLE public.transcripts
    ADD CONSTRAINT transcripts_video_id_fkey
    FOREIGN KEY (video_id) REFERENCES public.episodes (youtube_video_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS transcripts_tsv_gin_idx ON public.transcripts USING gin (tsv);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Uses the Phase 1 helper public.is_curator_or_admin() which reads role from profiles
-- (profiles keys on `id` = auth.uid(), not `user_id` — Phase 1 contract).
DROP POLICY IF EXISTS transcripts_curator_read ON public.transcripts;
CREATE POLICY transcripts_curator_read ON public.transcripts
  FOR SELECT
  USING (public.is_curator_or_admin());

DROP POLICY IF EXISTS transcripts_curator_write ON public.transcripts;
CREATE POLICY transcripts_curator_write ON public.transcripts
  FOR ALL
  USING (public.is_curator_or_admin())
  WITH CHECK (public.is_curator_or_admin());
