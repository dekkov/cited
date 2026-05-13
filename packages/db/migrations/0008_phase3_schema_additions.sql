-- Phase 3 schema additions
-- Adds: user_habit_status enum, user_habits lifecycle columns, habit_templates.cluster_id,
--       interview_runs table with RLS, hybrid retrieval indexes.

-- 1. Enum for user habit lifecycle
CREATE TYPE user_habit_status AS ENUM ('active', 'archived', 'graduated');

-- 2. user_habits: add status + lifecycle timestamps (D-09 graduation)
ALTER TABLE user_habits
  ADD COLUMN status user_habit_status NOT NULL DEFAULT 'active',
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN graduated_at TIMESTAMPTZ;

-- 3. habit_templates: cluster_id for swap diversity (SWAP-02; computed weekly by pg_cron)
ALTER TABLE habit_templates
  ADD COLUMN cluster_id INTEGER;

-- 4. interview_runs: stores per-user AI interview sessions (AION-05, REC-06)
CREATE TABLE interview_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_index INTEGER NOT NULL,
  profile_json JSONB,        -- SynthesisOutputSchema.profileSummary; null while in-progress
  candidates_json JSONB,     -- HabitCandidate[]; null while in-progress
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,  -- null = still running (D-03 "tell me more" pending)
  UNIQUE (user_id, run_index)
);

-- 5. RLS: owner-only access
ALTER TABLE interview_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY interview_runs_owner_select ON interview_runs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY interview_runs_owner_insert ON interview_runs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY interview_runs_owner_update ON interview_runs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. Hybrid retrieval indexes (verify existence; create if missing)
-- HNSW on clips.embedding for vector similarity search
CREATE INDEX IF NOT EXISTS clips_embedding_hnsw_idx ON clips USING hnsw (embedding vector_cosine_ops);
-- GIN on clips tsvector for full-text search (claim + rationale)
CREATE INDEX IF NOT EXISTS clips_claim_fts_gin_idx ON clips USING gin (to_tsvector('english', coalesce(claim, '') || ' ' || coalesce(rationale, '')));
-- HNSW on transcript_chunks.embedding for grounding check
CREATE INDEX IF NOT EXISTS transcript_chunks_embedding_hnsw_idx ON transcript_chunks USING hnsw (embedding vector_cosine_ops);
