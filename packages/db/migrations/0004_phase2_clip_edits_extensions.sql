-- Phase 2 — clip_edits action enum + payload + backfill (ADMN-11)
DO $$ BEGIN
  CREATE TYPE public.clip_edit_action AS ENUM (
    'created','updated','approved','rejected',
    'ai_suggested','ai_accepted','ai_rejected',
    'removed','unremoved','embedded','embed_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.clip_edits
  ADD COLUMN IF NOT EXISTS action public.clip_edit_action,
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- Backfill existing rows (any from Phase 1 — likely 0, but defensive)
UPDATE public.clip_edits SET action = 'updated' WHERE action IS NULL;

ALTER TABLE public.clip_edits ALTER COLUMN action SET NOT NULL;
