---
phase: 02-curation-tooling-doac-corpus
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/db/src/schema/transcripts.ts
  - packages/db/src/schema/episode-blacklist.ts
  - packages/db/src/schema/clip-edits.ts
  - packages/db/src/schema/clips.ts
  - packages/db/src/schema/episodes.ts
  - packages/db/src/schema/enums.ts
  - packages/db/src/schema/index.ts
  - packages/db/src/schema/aion10-fixture-candidates.ts
  - packages/db/migrations/0003_phase2_transcripts.sql
  - packages/db/migrations/0004_phase2_clip_edits_extensions.sql
  - packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql
  - packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql
  - packages/db/src/schema/schema.test.ts
autonomous: true
requirements: [ADMN-11]
must_haves:
  truths:
    - "transcripts table exists with JSONB segments + tsvector GIN index"
    - "clip_edits.action enum and payload jsonb column accept ai_suggested / ai_accepted / ai_rejected / removed / embedded values"
    - "clips have removed_at / removal_reason / removal_notes / takedown_ref_url columns"
    - "episode_blacklist table prevents re-ingest after takedown"
    - "episodes have oembed_404_count counter for flap suppression"
    - "RLS forbids any role other than curator/admin from reading transcripts and clip_edits"
  artifacts:
    - path: "packages/db/src/schema/transcripts.ts"
      provides: "transcripts table (video_id PK, segments JSONB, raw_text, tsv generated)"
    - path: "packages/db/src/schema/episode-blacklist.ts"
      provides: "episode_blacklist table (youtube_video_id PK, reason, blacklisted_at)"
    - path: "packages/db/src/schema/aion10-fixture-candidates.ts"
      provides: "dev-only fixture candidate table"
    - path: "packages/db/migrations/0003_phase2_transcripts.sql"
      provides: "transcripts + GIN index migration"
    - path: "packages/db/migrations/0004_phase2_clip_edits_extensions.sql"
      provides: "clip_edits action enum + payload column extensions"
    - path: "packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql"
      provides: "clips removal columns + episode_blacklist + episodes.oembed_404_count"
  key_links:
    - from: "packages/db/src/schema/transcripts.ts"
      to: "packages/db/src/schema/episodes.ts"
      via: "transcripts.video_id references episodes.youtube_video_id"
      pattern: "references.*episodes"
    - from: "packages/db/migrations/0003_phase2_transcripts.sql"
      to: "Postgres tsvector + GIN index"
      via: "GENERATED ALWAYS AS to_tsvector('english', raw_text) STORED + CREATE INDEX ... USING gin (tsv)"
      pattern: "GENERATED ALWAYS AS.*to_tsvector"
---

<objective>
Extend the Phase 1 Drizzle schema and migrations to support Phase 2 curation tooling: persistent `transcripts` storage (GA4 — Postgres JSONB + tsvector + GIN), extended `clip_edits` audit shape (ADMN-11 — `action` enum + `payload` JSONB), clip removal columns (GA6 — `removed_at`, `removal_reason`, `removal_notes`, `takedown_ref_url`), `episode_blacklist` (LGL-03 takedown re-ingest prevention), `episodes.oembed_404_count` (Pitfall 6 flap suppression), and a dev-only `aion10_fixture_candidates` staging table for AION-10 fixture promotion. RLS policies extend to new tables (curator/admin only).

Purpose: Lock the data model first — every other Phase 2 plan depends on these tables and columns. No application code yet; this is schema + migrations + tests only.

Output: Drizzle schema files, SQL migrations, and schema tests that prove every new table/column/index/RLS policy exists.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md
@.planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md
@packages/db/src/schema/index.ts
@packages/db/src/schema/clips.ts
@packages/db/src/schema/clip-edits.ts
@packages/db/src/schema/episodes.ts
@packages/db/src/schema/enums.ts
@packages/db/src/schema/transcript-chunks.ts
@packages/db/migrations/0000_init.sql
@packages/db/migrations/0001_extensions_and_rls.sql
@packages/db/migrations/0002_rls_policies.sql
@packages/db/drizzle.config.ts

<interfaces>
Existing enums (packages/db/src/schema/enums.ts):
- clipStatus: 'pending' | 'approved' | 'rejected' | 'removed_from_source'
- clipDomain: 'sleep' | 'nutrition_gut' | 'exercise_longevity' | 'mental_health'
- speakerStatus: 'verified' | 'unverified' | 'host'
- userRole: 'user' | 'curator' | 'admin'
- episodeAvailability: 'available' | 'removed_from_source' | 'unknown'

Existing clip_edits (packages/db/src/schema/clip-edits.ts):
```ts
export const clipEdits = pgTable('clip_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id').notNull().references(() => clips.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id'),
  source: text('source').notNull(),       // 'manual' | 'ai_copilot' (no enum yet)
  field: text('field').notNull(),
  beforeValue: jsonb('before_value'),
  afterValue: jsonb('after_value'),
  accepted: boolean('accepted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```
Phase 2 adds: `action clip_edit_action enum NOT NULL`, `payload jsonb`. Existing rows must be migrated with `action = 'updated'`.

Existing clips columns relevant here: status enum, embedding vector(1536), episodeId, approvedAt, approvedBy. Phase 2 adds removal columns.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add transcripts + episode_blacklist + aion10_fixture_candidates schema files and index them</name>
  <files>
    packages/db/src/schema/transcripts.ts,
    packages/db/src/schema/episode-blacklist.ts,
    packages/db/src/schema/aion10-fixture-candidates.ts,
    packages/db/src/schema/index.ts
  </files>
  <read_first>
    - packages/db/src/schema/index.ts (current barrel — append new exports)
    - packages/db/src/schema/episodes.ts (pattern for table file: imports, pgTable, default timestamps)
    - packages/db/src/schema/clips.ts (pattern for vector + array + sql import for default)
    - packages/db/src/schema/transcript-chunks.ts (existing chunk table — sibling to transcripts)
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA4 — Transcript Storage"
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Recommended File Structure" + §"Pattern 4 Transcript Chunking" + §"Fixture row shape"
  </read_first>
  <behavior>
    - schema.test.ts asserts `transcripts` table object exports with columns: videoId (PK text), source (text), segments (jsonb notNull), rawText (text notNull), language (text notNull default 'en'), fetchedAt (timestamptz notNull defaultNow)
    - schema.test.ts asserts `episodeBlacklist` exports with columns: youtubeVideoId (PK text), reason (text notNull), blacklistedAt (timestamptz notNull defaultNow), notes (text), takedownRefUrl (text)
    - schema.test.ts asserts `aion10FixtureCandidates` exports with columns: id (uuid PK), clipId (uuid fk → clips.id onDelete cascade), kind (text notNull), aiInput (jsonb notNull), aiOutput (jsonb notNull), expectedGrounded (boolean), reviewerNotes (text), reviewedAt (timestamptz), createdAt (timestamptz notNull defaultNow)
    - schema barrel re-exports `transcripts`, `episodeBlacklist`, `aion10FixtureCandidates`
  </behavior>
  <action>
Create `packages/db/src/schema/transcripts.ts` — VERBATIM:
```ts
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Note: video_id is the natural PK (matches episodes.youtube_video_id which is unique).
// FK is enforced in migration SQL after table creation (mirrors the auth.users pattern).
// The `tsv` tsvector column is GENERATED ALWAYS in migration SQL — Drizzle does not model generated columns;
// we omit it from the TS schema and rely on the migration for the GIN index.
export const transcripts = pgTable('transcripts', {
  videoId: text('video_id').primaryKey(),                     // youtube_video_id
  source: text('source').notNull(),                           // 'youtube_captions' | 'deepgram' | 'manual'
  segments: jsonb('segments').notNull(),                      // Array<{ start, end, text, words: WordTimestamped[] }>
  rawText: text('raw_text').notNull(),                        // joined text for tsv + display
  language: text('language').notNull().default('en'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Create `packages/db/src/schema/episode-blacklist.ts` — VERBATIM:
```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const episodeBlacklist = pgTable('episode_blacklist', {
  youtubeVideoId: text('youtube_video_id').primaryKey(),
  reason: text('reason').notNull(),                            // 'dmca' | 'speaker-request' | 'medical-risk' | 'other'
  notes: text('notes'),
  takedownRefUrl: text('takedown_ref_url'),
  blacklistedAt: timestamp('blacklisted_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Create `packages/db/src/schema/aion10-fixture-candidates.ts` — VERBATIM:
```ts
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clips } from './clips';

// Dev-only staging table. Curator promotes accepted/rejected co-pilot suggestions here during Phase 2;
// at phase end ~20 rows promote to tests/eval/aion-10/fixtures.jsonl (Plan 06).
export const aion10FixtureCandidates = pgTable('aion10_fixture_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id').references(() => clips.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),                                // 'suggest-start-end' | 'refine-claim' | 'propose-alternative'
  aiInput: jsonb('ai_input').notNull(),
  aiOutput: jsonb('ai_output').notNull(),
  expectedGrounded: boolean('expected_grounded'),              // curator's manual grade
  reviewerNotes: text('reviewer_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Append to `packages/db/src/schema/index.ts` (preserve all existing exports; add after `clips-pending` line):
```ts
export * from './transcripts';
export * from './episode-blacklist';
export * from './aion10-fixture-candidates';
```

Implements ADMN-11 audit-store requirements (fixture-candidate staging supports AION-10 — promoted in Plan 06).
  </action>
  <verify>
    <automated>cd /home/king/Hdiary &amp;&amp; pnpm --filter @hdiary/db exec tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - File exists: `packages/db/src/schema/transcripts.ts` and contains `export const transcripts = pgTable('transcripts'`
    - File exists: `packages/db/src/schema/episode-blacklist.ts` and contains `export const episodeBlacklist = pgTable('episode_blacklist'`
    - File exists: `packages/db/src/schema/aion10-fixture-candidates.ts` and contains `export const aion10FixtureCandidates = pgTable('aion10_fixture_candidates'`
    - `grep -q "export \* from './transcripts'" packages/db/src/schema/index.ts` exits 0
    - `grep -q "export \* from './episode-blacklist'" packages/db/src/schema/index.ts` exits 0
    - `pnpm --filter @hdiary/db exec tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Three new schema files exist and are exported from the barrel; package typechecks.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extend clip_edits + clips + episodes schema and add the `clip_edit_action` enum</name>
  <files>
    packages/db/src/schema/enums.ts,
    packages/db/src/schema/clip-edits.ts,
    packages/db/src/schema/clips.ts,
    packages/db/src/schema/episodes.ts,
    packages/db/src/schema/schema.test.ts
  </files>
  <read_first>
    - packages/db/src/schema/clip-edits.ts (current shape — must extend, not rewrite columns that exist)
    - packages/db/src/schema/clips.ts (current columns — append removal columns)
    - packages/db/src/schema/episodes.ts (append oembed counter)
    - packages/db/src/schema/enums.ts (pgEnum pattern)
    - packages/db/src/schema/schema.test.ts (existing test format)
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA6 — DMCA + Admin Removal"
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 7 `clip_edits.payload` Audit Shape" + §"Pitfall 6 oEmbed cron"
  </read_first>
  <behavior>
    - New enum `clipEditAction` exports values: 'created', 'updated', 'approved', 'rejected', 'ai_suggested', 'ai_accepted', 'ai_rejected', 'removed', 'unremoved', 'embedded', 'embed_failed'
    - `clipEdits` table gains `action` (clipEditAction notNull) and `payload` (jsonb) columns
    - `clips` table gains `removedAt` (timestamptz nullable), `removalReason` (text nullable), `removalNotes` (text nullable), `takedownRefUrl` (text nullable)
    - `episodes` table gains `sourceUnavailableAt` (timestamptz nullable), `oembed404Count` (integer notNull default 0)
    - schema.test.ts adds assertions for each new column
  </behavior>
  <action>
1) In `packages/db/src/schema/enums.ts`, append:
```ts
export const clipEditAction = pgEnum('clip_edit_action', [
  'created',
  'updated',
  'approved',
  'rejected',
  'ai_suggested',
  'ai_accepted',
  'ai_rejected',
  'removed',
  'unremoved',
  'embedded',
  'embed_failed',
]);
```

2) In `packages/db/src/schema/clip-edits.ts`, add `action` and `payload` columns (preserve existing columns + the FK note exactly). New definition:
```ts
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { clipEditAction } from './enums';
import { clips } from './clips';

export const clipEdits = pgTable('clip_edits', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id').notNull().references(() => clips.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id'),
  source: text('source').notNull(),
  field: text('field').notNull(),
  action: clipEditAction('action').notNull(),
  payload: jsonb('payload'),
  beforeValue: jsonb('before_value'),
  afterValue: jsonb('after_value'),
  accepted: boolean('accepted'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

3) In `packages/db/src/schema/clips.ts`, append four columns inside the pgTable definition (BEFORE the trailing closing `});`):
```ts
  removedAt: timestamp('removed_at', { withTimezone: true }),
  removalReason: text('removal_reason'),
  removalNotes: text('removal_notes'),
  takedownRefUrl: text('takedown_ref_url'),
```

4) In `packages/db/src/schema/episodes.ts`, append two columns inside the pgTable definition (BEFORE the trailing closing `});`):
```ts
  sourceUnavailableAt: timestamp('source_unavailable_at', { withTimezone: true }),
  oembed404Count: integer('oembed_404_count').notNull().default(0),
```
Also add `integer` to the existing imports from `drizzle-orm/pg-core`.

5) In `packages/db/src/schema/schema.test.ts`, add a new `describe('phase 2 extensions', ...)` block asserting:
   - `clipEdits.action` exists and is required (presence check)
   - `clipEdits.payload` exists
   - `clips.removedAt`, `clips.removalReason`, `clips.removalNotes`, `clips.takedownRefUrl` exist
   - `episodes.sourceUnavailableAt`, `episodes.oembed404Count` exist
   - `transcripts`, `episodeBlacklist`, `aion10FixtureCandidates` are exported from schema barrel

Pattern for column presence: existing tests in the file already do `expect(clips.embedding).toBeDefined()` — mirror that shape.
  </action>
  <verify>
    <automated>cd /home/king/Hdiary &amp;&amp; pnpm --filter @hdiary/db exec vitest run schema.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "clipEditAction = pgEnum" packages/db/src/schema/enums.ts` exits 0
    - `grep -q "action: clipEditAction" packages/db/src/schema/clip-edits.ts` exits 0
    - `grep -q "payload: jsonb" packages/db/src/schema/clip-edits.ts` exits 0
    - `grep -q "removedAt: timestamp" packages/db/src/schema/clips.ts` exits 0
    - `grep -q "takedownRefUrl: text" packages/db/src/schema/clips.ts` exits 0
    - `grep -q "oembed404Count: integer" packages/db/src/schema/episodes.ts` exits 0
    - `pnpm --filter @hdiary/db exec vitest run schema.test.ts` exits 0 with phase 2 extensions describe block passing
  </acceptance_criteria>
  <done>Enum + extended audit + removal + oembed counter columns present; schema tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Author the four migration SQL files (transcripts + tsv GIN, clip_edits extension, clips removal + episode_blacklist + oembed counter, aion10 fixtures) with RLS</name>
  <files>
    packages/db/migrations/0003_phase2_transcripts.sql,
    packages/db/migrations/0004_phase2_clip_edits_extensions.sql,
    packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql,
    packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql
  </files>
  <read_first>
    - packages/db/migrations/0000_init.sql (column types used by Phase 1 — match style)
    - packages/db/migrations/0001_extensions_and_rls.sql (extension provisioning, vector index pattern)
    - packages/db/migrations/0002_rls_policies.sql (RLS policy shape: ENABLE ROW LEVEL SECURITY, CREATE POLICY ... USING ...)
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA4 — Transcript Storage"
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 5 HNSW iterative scan"
  </read_first>
  <action>
Create `packages/db/migrations/0003_phase2_transcripts.sql` — VERBATIM (idempotent guards):
```sql
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

DROP POLICY IF EXISTS transcripts_curator_read ON public.transcripts;
CREATE POLICY transcripts_curator_read ON public.transcripts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('curator','admin')
    )
  );

DROP POLICY IF EXISTS transcripts_curator_write ON public.transcripts;
CREATE POLICY transcripts_curator_write ON public.transcripts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('curator','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('curator','admin')
    )
  );
```

Create `packages/db/migrations/0004_phase2_clip_edits_extensions.sql`:
```sql
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
```

Create `packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql`:
```sql
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
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('curator','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('curator','admin')
    )
  );
```

Create `packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql`:
```sql
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
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('curator','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role IN ('curator','admin')
    )
  );
```

Note: `profiles.user_id` is the assumed column name (Phase 1). If Phase 1's profile table keys on `id` joined to `auth.users`, executor must read `packages/db/migrations/0002_rls_policies.sql` and mirror the EXACT column reference used there. Adjust before running.

  </action>
  <verify>
    <automated>ls packages/db/migrations/0003_phase2_transcripts.sql packages/db/migrations/0004_phase2_clip_edits_extensions.sql packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql && grep -l "ENABLE ROW LEVEL SECURITY" packages/db/migrations/0003_phase2_transcripts.sql packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql</automated>
  </verify>
  <acceptance_criteria>
    - Files exist: `0003_phase2_transcripts.sql`, `0004_phase2_clip_edits_extensions.sql`, `0005_phase2_clips_removal_episode_blacklist.sql`, `0006_phase2_aion10_fixture_candidates.sql`
    - `grep -q "GENERATED ALWAYS AS (to_tsvector" packages/db/migrations/0003_phase2_transcripts.sql` exits 0
    - `grep -q "USING gin (tsv)" packages/db/migrations/0003_phase2_transcripts.sql` exits 0
    - `grep -q "CREATE TYPE public.clip_edit_action AS ENUM" packages/db/migrations/0004_phase2_clip_edits_extensions.sql` exits 0
    - `grep -q "ADD COLUMN IF NOT EXISTS removed_at" packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql` exits 0
    - `grep -q "CREATE TABLE IF NOT EXISTS public.episode_blacklist" packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql` exits 0
    - All three new tables (`transcripts`, `episode_blacklist`, `aion10_fixture_candidates`) have `ENABLE ROW LEVEL SECURITY` + at least one `CREATE POLICY` clause
  </acceptance_criteria>
  <done>Four migrations exist with correct DDL, tsvector GIN index, RLS policies; ready for `drizzle-kit push` in Plan 03.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Provision DEEPGRAM_API_KEY env var contract + install Phase 2 npm dependencies</name>
  <files>
    apps/web/package.json,
    apps/web/.env.example,
    packages/core/package.json
  </files>
  <read_first>
    - apps/web/package.json (current dependency set — append, do not replace)
    - apps/web/.env.example (current env contract — append DEEPGRAM_API_KEY)
    - packages/core/package.json (transcripts package will live here in Plan 02 — needs deepgram + youtube-transcript-plus as deps)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"New to Phase 2" + §"Installation"
  </read_first>
  <action>
1) Verify latest versions before pinning (run in repo root):
```bash
npm view youtube-transcript-plus version
npm view @deepgram/sdk version
npm view ai version
npm view @ai-sdk/openai version
npm view @ai-sdk/anthropic version
npm view react-resizable-panels version
npm view @dnd-kit/core version
npm view @dnd-kit/sortable version
npm view @dnd-kit/utilities version
npm view @tanstack/react-virtual version
npm view subtitle version
npm view diff version
```

2) Install into `apps/web` (UI + AI SDK + dnd + virtualization + diff):
```bash
pnpm add -F web react-resizable-panels @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @tanstack/react-virtual diff
pnpm add -F web -D @types/diff
```

3) Install transcript libraries into `@hdiary/core` (where `packages/core/transcripts/` will live in Plan 02):
```bash
pnpm add -F @hdiary/core youtube-transcript-plus @deepgram/sdk subtitle
```

4) Add shadcn primitives required by UI-SPEC:
```bash
cd apps/web && pnpm dlx shadcn@latest add dialog tabs select textarea checkbox tooltip badge dropdown-menu form toast
```

5) Append to `apps/web/.env.example` (do not remove existing entries):
```
# Phase 2 — transcript fallback (GA3 path D)
DEEPGRAM_API_KEY=
# Phase 2 — pg_cron oEmbed handler shared secret (ADMN-08)
CRON_SECRET=
```

6) Provision Deepgram account (manual side of task): create free Deepgram account at https://console.deepgram.com, generate API key, paste into local `.env.local`. Document this in `apps/web/.env.example` comment only — do not commit the actual key. Budget cap: 30 episodes × ~$0.77 worst-case = ~$23 total Phase 2 burn.

7) Add `assertEnv` check in `apps/web/lib/env.ts` (create file if missing) that throws on startup if `DEEPGRAM_API_KEY` / `CRON_SECRET` are unset in non-test environments. Mirror pattern from existing Phase 1 env validation if one exists; otherwise simple:
```ts
const required = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPGRAM_API_KEY', 'CRON_SECRET'];
for (const k of required) {
  if (!process.env[k] && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required env var: ${k}`);
  }
}
```
  </action>
  <verify>
    <automated>cd /home/king/Hdiary && grep -q "youtube-transcript-plus" packages/core/package.json && grep -q "@deepgram/sdk" packages/core/package.json && grep -q "react-resizable-panels" apps/web/package.json && grep -q "@dnd-kit/core" apps/web/package.json && grep -q "@tanstack/react-virtual" apps/web/package.json && grep -q "DEEPGRAM_API_KEY=" apps/web/.env.example && grep -q "CRON_SECRET=" apps/web/.env.example</automated>
  </verify>
  <acceptance_criteria>
    - `packages/core/package.json` lists `youtube-transcript-plus`, `@deepgram/sdk`, `subtitle` in `dependencies`
    - `apps/web/package.json` lists `react-resizable-panels`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@tanstack/react-virtual`, `diff` in dependencies and `@types/diff` in devDependencies
    - `apps/web/components/ui/dialog.tsx`, `tabs.tsx`, `select.tsx`, `textarea.tsx`, `checkbox.tsx`, `tooltip.tsx`, `badge.tsx`, `dropdown-menu.tsx`, `form.tsx`, `toast.tsx` exist (shadcn output paths)
    - `apps/web/.env.example` contains `DEEPGRAM_API_KEY=` and `CRON_SECRET=` (exact string)
    - `pnpm install` exits 0 from repo root with no peer-dep errors
  </acceptance_criteria>
  <done>All Phase 2 npm dependencies installed; env contract published; shadcn primitives generated; ready for Plans 02–05 to import.</done>
</task>

</tasks>

<verification>
- `pnpm --filter @hdiary/db exec tsc --noEmit` exits 0
- `pnpm --filter @hdiary/db exec vitest run schema.test.ts` exits 0
- All four migration SQL files exist and are syntactically valid (psql parses without error against an empty Postgres 17.3 + pgvector 0.8.2 + Phase 1 baseline)
- `apps/web/.env.example` declares `DEEPGRAM_API_KEY` and `CRON_SECRET`
- `pnpm install` from repo root completes without peer-dep errors
</verification>

<success_criteria>
1. `transcripts` table has `tsv` generated column + GIN index (smoke: `\d+ transcripts` in psql shows the GIN index).
2. `clip_edit_action` enum exists in Postgres with 11 values.
3. `clip_edits.payload` is `jsonb` nullable, `clip_edits.action` is `clip_edit_action NOT NULL`.
4. `clips` has four removal columns; `episodes` has `oembed_404_count` defaulting to 0.
5. `episode_blacklist` and `aion10_fixture_candidates` tables exist with RLS enabled and curator/admin-only policies.
6. New npm deps installed; shadcn primitives generated; env contract published.
</success_criteria>

<output>
After completion, create `.planning/phases/02-curation-tooling-doac-corpus/02-01-SUMMARY.md`.
</output>
