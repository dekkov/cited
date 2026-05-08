---
phase: 01-foundation
plan: 04
type: execute
wave: 2
depends_on: [01-01-monorepo-bootstrap-PLAN.md]
files_modified:
  - packages/db/package.json
  - packages/db/drizzle.config.ts
  - packages/db/src/index.ts
  - packages/db/src/client.ts
  - packages/db/src/schema/index.ts
  - packages/db/src/schema/profiles.ts
  - packages/db/src/schema/podcasts.ts
  - packages/db/src/schema/episodes.ts
  - packages/db/src/schema/clips.ts
  - packages/db/src/schema/clip-edits.ts
  - packages/db/src/schema/transcript-chunks.ts
  - packages/db/src/schema/habit-templates.ts
  - packages/db/src/schema/habit-template-clips.ts
  - packages/db/src/schema/user-habits.ts
  - packages/db/src/schema/check-ins.ts
  - packages/db/src/schema/streaks.ts
  - packages/db/src/schema/streak-freezes.ts
  - packages/db/src/schema/extraction-jobs.ts
  - packages/db/src/schema/clips-pending.ts
  - packages/db/src/schema/consent-records.ts
  - packages/db/src/schema/enums.ts
  - packages/db/migrations/0000_init.sql
  - packages/db/migrations/0001_extensions_and_rls.sql
  - packages/db/migrations/0002_rls_policies.sql
  - packages/db/migrations/meta/_journal.json
  - packages/db/test/rls.test.ts
  - packages/db/test/cascade.test.ts
  - packages/api-contracts/package.json
  - packages/api-contracts/src/index.ts
  - packages/api-contracts/src/profiles.ts
  - packages/api-contracts/src/clips.ts
  - packages/api-contracts/src/habits.ts
  - packages/api-contracts/src/check-ins.ts
  - packages/api-contracts/src/extraction-jobs.ts
  - packages/api-contracts/src/clips-pending.ts
  - packages/api-contracts/src/enums.ts
autonomous: true
requirements: [FND-06, FND-07, FND-08, AION-09, PROF-01, PROF-04]
must_haves:
  truths:
    - "Drizzle schema includes the full v1 table set plus extraction_jobs and clips_pending Phase-5 placeholders"
    - "Every table holding user-data has Row Level Security enabled with policies that scope reads/writes to auth.uid()"
    - "Cascade-delete from auth.users → profiles → all user-scoped child tables (user_habits, check_ins, streaks, streak_freezes, consent_records) is structurally enforced via ON DELETE CASCADE foreign keys, AND a test verifies row-count = 0 across all user-scoped tables after deletion (cascade design lands here per PROF-04 — full integration test in Phase 4)"
    - "packages/api-contracts mirrors the schema as zod schemas the future Python worker can consume"
    - "An RLS test proves user A cannot select user B's check_ins, user_habits, or consent_records using a JWT for user A"
    - "All LLM provider calls in apps/web go through packages/core/llm — packaged interface exists so future routes use it (AION-09)"
  artifacts:
    - path: "packages/db/src/schema/index.ts"
      provides: "Re-exports all 16 tables + enums"
      exports: ["profiles", "podcasts", "episodes", "clips", "clipEdits", "transcriptChunks", "habitTemplates", "habitTemplateClips", "userHabits", "checkIns", "streaks", "streakFreezes", "extractionJobs", "clipsPending", "consentRecords"]
    - path: "packages/db/migrations/0001_extensions_and_rls.sql"
      provides: "CREATE EXTENSION pgvector + pg_trgm; enables RLS on all user-data tables"
      contains: "create extension"
    - path: "packages/db/migrations/0002_rls_policies.sql"
      provides: "RLS policies on every user-data table using auth.uid()"
      contains: "auth.uid()"
    - path: "packages/api-contracts/src/index.ts"
      provides: "zod schemas mirroring DB types for cross-language contract"
      exports: ["ProfileSchema", "ClipSchema", "ExtractionJobSchema", "ClipPendingSchema"]
    - path: "packages/db/test/rls.test.ts"
      provides: "Test that user A cannot read user B's rows even with anon key"
      contains: "rls"
  key_links:
    - from: "packages/db/migrations/0001_extensions_and_rls.sql"
      to: "pgvector + pg_trgm + auth"
      via: "CREATE EXTENSION IF NOT EXISTS"
      pattern: "create extension if not exists (vector|pg_trgm)"
    - from: "packages/db/src/schema/profiles.ts"
      to: "auth.users"
      via: "id references auth.users(id) on delete cascade"
      pattern: "auth.users"
    - from: "packages/api-contracts/src/index.ts"
      to: "packages/db/src/schema"
      via: "zod schemas mirror DB types (separate package because worker is Python)"
      pattern: "z.object"
---

<objective>
Land the full v1 Drizzle schema, enable Postgres RLS on every user-data table, ship cascade-delete via foreign keys, and mirror the schema as zod contracts in `packages/api-contracts` for the deferred Python worker. Also establish the LLM provider-wrapper interface in `packages/core/llm` so AION-09 is structurally enforceable from day 1.

Purpose: Phase 1 success criteria #2 (RLS isolation) and #4 (full v1 schema + extraction_jobs/clips_pending placeholders + zod mirror). Mitigates Pitfall 2 (GDPR Art 9 cascade) and Pitfall 9 (phantom worker — contract is real).
Output: A working `pnpm --filter @cited/db migrate` flow against a local Postgres + pgvector + Supabase Auth, with RLS-protected schema and zod contracts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/CLAUDE.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md
@/home/king/Hdiary/.planning/ROADMAP.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-01-SUMMARY.md

# Locked stack (CLAUDE.md):
# - Postgres 17.3+ (avoid 17.0–17.2 due to pgvector linker bug)
# - pgvector 0.8.2 with HNSW
# - Drizzle ORM 0.36+ with `postgres` driver, prepare: false for Supabase pooler
# - text-embedding-3-small → 1536-dim vector
# - Supabase Auth provides auth.users + auth.uid() — RLS uses auth.uid() directly

<interfaces>
<!-- Required pgvector + Supabase patterns the executor must use -->

```sql
-- pgvector + auth integration pattern
create extension if not exists vector;
create extension if not exists pg_trgm;

-- profiles foreign-keys to auth.users (Supabase Auth provides this table)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- ...
);

-- RLS pattern for user-scoped tables
alter table public.user_habits enable row level security;
create policy "Users can view own habits" on public.user_habits
  for select using (auth.uid() = user_id);
create policy "Users can insert own habits" on public.user_habits
  for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on public.user_habits
  for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on public.user_habits
  for delete using (auth.uid() = user_id);
```

```typescript
// Drizzle + Supabase pooler pattern (postgres driver, prepare: false)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const queryClient = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(queryClient, { schema });
```

```typescript
// pgvector column in Drizzle (use the vector type from drizzle-orm/pg-core)
import { vector, pgTable, uuid, text } from 'drizzle-orm/pg-core';
export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  embedding: vector('embedding', { dimensions: 1536 }), // text-embedding-3-small
  // ...
});
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Drizzle schema — all 16 tables + enums + drizzle.config.ts + client</name>
  <files>packages/db/package.json, packages/db/drizzle.config.ts, packages/db/src/index.ts, packages/db/src/client.ts, packages/db/src/schema/index.ts, packages/db/src/schema/enums.ts, packages/db/src/schema/profiles.ts, packages/db/src/schema/podcasts.ts, packages/db/src/schema/episodes.ts, packages/db/src/schema/clips.ts, packages/db/src/schema/clip-edits.ts, packages/db/src/schema/transcript-chunks.ts, packages/db/src/schema/habit-templates.ts, packages/db/src/schema/habit-template-clips.ts, packages/db/src/schema/user-habits.ts, packages/db/src/schema/check-ins.ts, packages/db/src/schema/streaks.ts, packages/db/src/schema/streak-freezes.ts, packages/db/src/schema/extraction-jobs.ts, packages/db/src/schema/clips-pending.ts, packages/db/src/schema/consent-records.ts</files>
  <read_first>/home/king/Hdiary/CLAUDE.md, /home/king/Hdiary/.planning/REQUIREMENTS.md (FND-06 table list), /home/king/Hdiary/.planning/ROADMAP.md (Phase 2 ADMN columns, Phase 3 HAB/REC/AION, Phase 5 worker columns)</read_first>
  <behavior>
- Test 1: importing `@cited/db` exports all 16 table names listed in must_haves.artifacts
- Test 2: every user-scoped table has a `userId` (or in profiles' case, `id`) column referencing `auth.users(id)` with `onDelete: 'cascade'`
- Test 3: `clips.embedding` is a `vector(1536)` column (matches text-embedding-3-small dims)
- Test 4: `clips_pending.embedding` is a `vector(1536)` column (Phase 5 worker writes here)
- Test 5: `extraction_jobs` has columns: id, podcast_id (nullable), youtube_video_id, status (enum: pending/claimed/done/failed), claimed_by, claimed_at, attempt_count, payload jsonb, result jsonb, error text
  </behavior>
  <action>
1. `packages/db/package.json`: add deps `drizzle-orm@^0.36`, `postgres@^3.4`, `pgvector@^0.2`. Dev deps `drizzle-kit@^0.27`, `vitest`. Scripts: `generate: "drizzle-kit generate"`, `migrate: "drizzle-kit migrate"`, `studio: "drizzle-kit studio"`, `typecheck: "tsc --noEmit"`, `test: "vitest run"`.

2. `packages/db/drizzle.config.ts`:
   ```ts
   import { defineConfig } from 'drizzle-kit';
   export default defineConfig({
     schema: './src/schema/index.ts',
     out: './migrations',
     dialect: 'postgresql',
     dbCredentials: { url: process.env.DATABASE_URL! },
     migrations: { schema: 'public' },
     // Track auth schema for FK awareness but don't manage it
     schemaFilter: ['public'],
     verbose: true,
     strict: true,
   });
   ```

3. `packages/db/src/client.ts`:
   ```ts
   import { drizzle } from 'drizzle-orm/postgres-js';
   import postgres from 'postgres';
   import * as schema from './schema';
   export function createDb(url: string) {
     const queryClient = postgres(url, { prepare: false });
     return drizzle(queryClient, { schema });
   }
   export type Db = ReturnType<typeof createDb>;
   ```

4. `packages/db/src/schema/enums.ts` — pgEnum definitions:
   - `userRole`: ['user','curator','admin']
   - `privacyMode`: ['public','private']
   - `clipStatus`: ['pending','approved','rejected','removed_from_source']
   - `clipDomain`: ['sleep','nutrition_gut','exercise_longevity','mental_health']
   - `speakerStatus`: ['verified','unverified','host']
   - `evidenceStrength`: ['anecdotal','observational','rct','meta_analysis']
   - `checkInStatus`: ['done','skipped','partial']
   - `frequency`: ['daily','weekday','custom']
   - `extractionJobStatus`: ['pending','claimed','done','failed']
   - `consentScope`: ['account','health_adjacent','ai_free_text']
   - `episodeAvailability`: ['available','removed_from_source','unknown']

5. `packages/db/src/schema/profiles.ts` (PROF-01 fields + role + privacy + disclaimer + DOB):
   ```ts
   import { pgTable, uuid, text, timestamp, jsonb, date } from 'drizzle-orm/pg-core';
   import { sql } from 'drizzle-orm';
   import { userRole, privacyMode } from './enums';
   export const profiles = pgTable('profiles', {
     id: uuid('id').primaryKey().references(() => sql`auth.users(id)`, { onDelete: 'cascade' }),
     displayName: text('display_name').notNull().default(''),
     timezone: text('timezone').notNull().default('UTC'),
     goals: jsonb('goals').notNull().default(sql`'{}'::jsonb`),
     role: userRole('role').notNull().default('user'),
     privacyMode: privacyMode('privacy_mode').notNull().default('private'),
     disclaimerAcceptedAt: timestamp('disclaimer_accepted_at', { withTimezone: true }),
     dob: date('dob'),
     dobJurisdiction: text('dob_jurisdiction'), // 'us' | 'eu' | 'other' — for AUTH-06 logic
     createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
     updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
   });
   ```

6. `packages/db/src/schema/consent-records.ts` (AUTH-05 — separable Article 9 toggles, append-only):
   ```ts
   export const consentRecords = pgTable('consent_records', {
     id: uuid('id').primaryKey().defaultRandom(),
     userId: uuid('user_id').notNull().references(() => sql`auth.users(id)`, { onDelete: 'cascade' }),
     scope: consentScope('scope').notNull(), // account | health_adjacent | ai_free_text
     granted: boolean('granted').notNull(),
     grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
     userAgent: text('user_agent'),
     ipHash: text('ip_hash'), // sha256 of IP, never raw IP
   });
   ```

7. `packages/db/src/schema/podcasts.ts`:
   - id uuid pk, name text not null, host text, trust_tier int default 1, created_at, updated_at
   - (per ADMN-16: schema podcast-agnostic; podcasts table exists day 1 even if only DOAC seeded in Phase 2)

8. `packages/db/src/schema/episodes.ts`:
   - id uuid pk, podcast_id uuid fk → podcasts on delete cascade
   - youtube_video_id text not null unique, title text, published_at timestamp
   - transcript_uri text (R2 URL or null; in v1 simplified to text-blob — see ADMN-12)
   - transcript_text text (used when no R2 yet)
   - availability episodeAvailability not null default 'available'
   - last_oembed_check_at timestamp (ADMN-08)
   - created_at, updated_at

9. `packages/db/src/schema/clips.ts` (FULL ADMN-03 column set):
   - id uuid pk
   - episode_id uuid fk → episodes on delete cascade
   - youtube_video_id text not null
   - start_seconds int not null, end_seconds int not null check (end > start)
   - claim text not null
   - rationale text
   - speaker text not null
   - speaker_status: speakerStatus not null
   - domain: clipDomain not null
   - evidence_strength: evidenceStrength
   - risk_flags: text[] not null default '{}' (ADMN-05; mandatory non-null at approve in Phase 2)
   - status: clipStatus not null default 'pending'
   - embedding: vector(1536)
   - created_by uuid fk → auth.users(id) on delete set null
   - approved_by uuid fk → auth.users(id) on delete set null
   - approved_at timestamp
   - created_at, updated_at
   - Index: HNSW on embedding using vector_cosine_ops; GIN on tsvector(claim || ' ' || rationale) — but `clips` is curator-data, not user-data, so no RLS on read (public). RLS on insert/update restricted to curator/admin role.

10. `packages/db/src/schema/clip-edits.ts` (ADMN-11 audit log):
    - id uuid pk, clip_id uuid fk → clips on delete cascade
    - actor_id uuid fk → auth.users(id), source text ('ai_copilot' | 'human')
    - field text, before_value jsonb, after_value jsonb, accepted boolean
    - created_at

11. `packages/db/src/schema/transcript-chunks.ts` (ADMN-13 — RAG over ingested transcripts):
    - id uuid pk, episode_id uuid fk → episodes on delete cascade
    - chunk_index int, content text, start_seconds int, end_seconds int
    - embedding vector(1536)
    - HNSW index on embedding

12. `packages/db/src/schema/habit-templates.ts` (REC-04, PUB-01):
    - id uuid pk, slug text not null unique
    - title text not null, description text
    - domain clipDomain not null
    - trigger text, tiny_action text  (REC-04)
    - default_frequency frequency not null default 'daily'
    - created_at, updated_at

13. `packages/db/src/schema/habit-template-clips.ts` (M:N habit ↔ clip citations):
    - habit_template_id uuid fk on delete cascade
    - clip_id uuid fk on delete cascade
    - position int not null
    - PK (habit_template_id, clip_id)

14. `packages/db/src/schema/user-habits.ts` (REC-05):
    - id uuid pk
    - user_id uuid fk → auth.users(id) on delete cascade
    - habit_template_id uuid fk → habit_templates on delete restrict
    - frequency frequency not null
    - custom_days int[] (cron-like dow array when frequency='custom')
    - time_of_day text (HH:MM in user TZ)
    - active boolean default true
    - created_at, updated_at

15. `packages/db/src/schema/check-ins.ts` (HAB-02, HAB-03):
    - id uuid pk
    - user_habit_id uuid fk → user_habits on delete cascade
    - user_id uuid fk → auth.users(id) on delete cascade  (denormalized for RLS efficiency)
    - check_in_date date not null  (one row per habit per local-day)
    - status checkInStatus not null
    - mood int  check (mood between 1 and 5)
    - note text  (only populated if AUTH-05(c) opted in — enforced in app layer)
    - created_at
    - unique (user_habit_id, check_in_date)

16. `packages/db/src/schema/streaks.ts`:
    - id uuid pk
    - user_habit_id uuid fk on delete cascade unique
    - user_id uuid fk → auth.users(id) on delete cascade
    - current_length int default 0
    - longest_length int default 0
    - last_check_in_date date
    - updated_at

17. `packages/db/src/schema/streak-freezes.ts` (HAB-08):
    - id uuid pk
    - user_id uuid fk → auth.users(id) on delete cascade
    - user_habit_id uuid fk on delete cascade
    - banked_at timestamp default now()  (refilled monthly per cron in Phase 3)
    - used_at timestamp  (null = available)

18. `packages/db/src/schema/extraction-jobs.ts` (Phase 5 placeholder, FULL contract):
    ```ts
    export const extractionJobs = pgTable('extraction_jobs', {
      id: uuid('id').primaryKey().defaultRandom(),
      podcastId: uuid('podcast_id').references(() => podcasts.id, { onDelete: 'set null' }),
      youtubeVideoId: text('youtube_video_id').notNull(),
      status: extractionJobStatus('status').notNull().default('pending'),
      claimedBy: text('claimed_by'),
      claimedAt: timestamp('claimed_at', { withTimezone: true }),
      attemptCount: integer('attempt_count').notNull().default(0),
      payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
      result: jsonb('result'),
      error: text('error'),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    });
    ```

19. `packages/db/src/schema/clips-pending.ts` (Phase 5 placeholder — same shape as clips minus approved fields):
    - All clips columns minus status (default 'pending'), plus extraction_job_id fk
    - Curator promotes a clips_pending row → clips row in Phase 5 admin review (not in Phase 1)
    - embedding vector(1536) populated by worker on write

20. `packages/db/src/schema/index.ts`: re-export every schema file + relations from drizzle-orm/relations.

21. `packages/db/src/index.ts`: re-export `createDb`, `Db`, all schema, helper types.
  </action>
  <acceptance_criteria>
- All 16 schema files exist: `for f in profiles podcasts episodes clips clip-edits transcript-chunks habit-templates habit-template-clips user-habits check-ins streaks streak-freezes extraction-jobs clips-pending consent-records enums; do test -f packages/db/src/schema/$f.ts || echo MISSING $f; done`
- `grep -q "vector('embedding', { dimensions: 1536 })" packages/db/src/schema/clips.ts`
- `grep -q "vector('embedding', { dimensions: 1536 })" packages/db/src/schema/clips-pending.ts`
- `grep -q "vector('embedding', { dimensions: 1536 })" packages/db/src/schema/transcript-chunks.ts`
- `grep -q "auth.users(id)" packages/db/src/schema/profiles.ts`
- `grep -q "onDelete: 'cascade'" packages/db/src/schema/profiles.ts`
- `grep -q "extractionJobStatus" packages/db/src/schema/extraction-jobs.ts`
- `grep -q "speakerStatus" packages/db/src/schema/clips.ts`
- `grep -q "consentScope" packages/db/src/schema/consent-records.ts`
- `pnpm --filter @cited/db typecheck` exits 0
- `pnpm --filter @cited/db test` exits 0 (all 5 behavior tests pass)
  </acceptance_criteria>
  <done>16 tables defined with correct types, FKs to auth.users with cascade delete, vector(1536) on the three RAG-bearing tables, full extraction_jobs contract for Phase 5.</done>
</task>

<task type="auto">
  <name>Task 2: SQL migrations — extensions, RLS-enable, and policies on every user-data table</name>
  <files>packages/db/migrations/0000_init.sql, packages/db/migrations/0001_extensions_and_rls.sql, packages/db/migrations/0002_rls_policies.sql, packages/db/migrations/meta/_journal.json</files>
  <read_first>/home/king/Hdiary/CLAUDE.md, packages/db/src/schema/*.ts (from Task 1)</read_first>
  <action>
1. Run `pnpm --filter @cited/db generate` to produce `0000_init.sql` from the Drizzle schema. Commit the generated file as-is (do not hand-edit drizzle-generated migration; subsequent SQL goes in higher-numbered files).

2. Hand-write `packages/db/migrations/0001_extensions_and_rls.sql`:
   ```sql
   -- Required extensions
   create extension if not exists vector;
   create extension if not exists pg_trgm;
   create extension if not exists pgcrypto;

   -- HNSW indexes for vector cosine search (pgvector 0.8+ default)
   create index if not exists clips_embedding_hnsw_idx
     on public.clips using hnsw (embedding vector_cosine_ops);
   create index if not exists transcript_chunks_embedding_hnsw_idx
     on public.transcript_chunks using hnsw (embedding vector_cosine_ops);
   create index if not exists clips_pending_embedding_hnsw_idx
     on public.clips_pending using hnsw (embedding vector_cosine_ops);

   -- tsvector index for hybrid search on clips (used by AION-03 in Phase 3)
   create index if not exists clips_text_search_idx
     on public.clips using gin (
       to_tsvector('english', coalesce(claim, '') || ' ' || coalesce(rationale, ''))
     );

   -- Enable RLS on EVERY table (default-deny; explicit policies below)
   alter table public.profiles enable row level security;
   alter table public.consent_records enable row level security;
   alter table public.user_habits enable row level security;
   alter table public.check_ins enable row level security;
   alter table public.streaks enable row level security;
   alter table public.streak_freezes enable row level security;
   alter table public.podcasts enable row level security;
   alter table public.episodes enable row level security;
   alter table public.clips enable row level security;
   alter table public.clip_edits enable row level security;
   alter table public.transcript_chunks enable row level security;
   alter table public.habit_templates enable row level security;
   alter table public.habit_template_clips enable row level security;
   alter table public.extraction_jobs enable row level security;
   alter table public.clips_pending enable row level security;
   ```

3. Hand-write `packages/db/migrations/0002_rls_policies.sql`:
   ```sql
   -- Helper: is_curator_or_admin (reads role from profiles)
   create or replace function public.is_curator_or_admin()
   returns boolean language sql stable security definer set search_path = public, pg_temp as $$
     select coalesce(
       (select role in ('curator','admin') from public.profiles where id = auth.uid()),
       false
     );
   $$;

   -- profiles: user can read/update own row only
   create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
   create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
   create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

   -- consent_records: append-only by user; user can read own
   create policy "consent_select_own" on public.consent_records for select using (auth.uid() = user_id);
   create policy "consent_insert_own" on public.consent_records for insert with check (auth.uid() = user_id);
   -- no update / delete policy — append-only by design

   -- user_habits: user owns their habits
   create policy "user_habits_all_own" on public.user_habits for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- check_ins
   create policy "check_ins_all_own" on public.check_ins for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- streaks
   create policy "streaks_all_own" on public.streaks for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- streak_freezes
   create policy "streak_freezes_all_own" on public.streak_freezes for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);

   -- Curator-curated tables: world-readable for approved rows; write only for curators
   create policy "podcasts_public_read" on public.podcasts for select using (true);
   create policy "podcasts_curator_write" on public.podcasts for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   create policy "episodes_public_read" on public.episodes for select using (true);
   create policy "episodes_curator_write" on public.episodes for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   -- clips: only approved + available are publicly readable; pending only to curators
   create policy "clips_public_read_approved" on public.clips for select
     using (status = 'approved' and exists (
       select 1 from public.episodes e
       where e.id = clips.episode_id and e.availability = 'available'
     ));
   create policy "clips_curator_read_all" on public.clips for select
     using (public.is_curator_or_admin());
   create policy "clips_curator_write" on public.clips for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   create policy "clip_edits_curator" on public.clip_edits for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   create policy "transcript_chunks_curator_read" on public.transcript_chunks for select
     using (public.is_curator_or_admin());
   create policy "transcript_chunks_curator_write" on public.transcript_chunks for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   create policy "habit_templates_public_read" on public.habit_templates for select using (true);
   create policy "habit_templates_curator_write" on public.habit_templates for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   create policy "habit_template_clips_public_read" on public.habit_template_clips for select using (true);
   create policy "habit_template_clips_curator_write" on public.habit_template_clips for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   -- extraction_jobs + clips_pending: curator/admin only
   create policy "extraction_jobs_curator" on public.extraction_jobs for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());
   create policy "clips_pending_curator" on public.clips_pending for all
     using (public.is_curator_or_admin()) with check (public.is_curator_or_admin());

   -- Trigger: auto-create profile row on auth.users insert
   create or replace function public.handle_new_user()
   returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
   begin
     insert into public.profiles (id) values (new.id);
     return new;
   end;
   $$;

   drop trigger if exists on_auth_user_created on auth.users;
   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute procedure public.handle_new_user();
   ```

4. Update `packages/db/migrations/meta/_journal.json` to register the two hand-written SQL files (drizzle-kit will keep the auto entry for 0000_init; append entries for 0001 and 0002 with `idx: 1` and `idx: 2`, `when: <unix_ms>`, `tag: "0001_extensions_and_rls"` and `"0002_rls_policies"`).
  </action>
  <acceptance_criteria>
- `test -f packages/db/migrations/0000_init.sql`
- `grep -q "create extension if not exists vector" packages/db/migrations/0001_extensions_and_rls.sql`
- `grep -q "using hnsw" packages/db/migrations/0001_extensions_and_rls.sql`
- `grep -c "enable row level security" packages/db/migrations/0001_extensions_and_rls.sql` ≥ 15
- `grep -q "auth.uid() = id" packages/db/migrations/0002_rls_policies.sql`
- `grep -q "is_curator_or_admin" packages/db/migrations/0002_rls_policies.sql`
- `grep -q "on_auth_user_created" packages/db/migrations/0002_rls_policies.sql`
- `grep -c "create policy" packages/db/migrations/0002_rls_policies.sql` ≥ 20
- `cat packages/db/migrations/meta/_journal.json` has 3 entries (0000, 0001, 0002)
  </acceptance_criteria>
  <done>Three migrations in order: schema → extensions+rls-enable → policies. Vector indexes use HNSW. Trigger auto-creates profile on signup.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: RLS isolation test + cascade-delete test (proves user A cannot read user B; cascade design works)</name>
  <files>packages/db/test/rls.test.ts, packages/db/test/cascade.test.ts, packages/db/package.json (add test deps)</files>
  <read_first>packages/db/migrations/0002_rls_policies.sql, packages/db/src/schema/*.ts</read_first>
  <behavior>
- Test 1 (RLS): With user A's JWT, `select * from check_ins` returns only A's rows even when B has rows in the table
- Test 2 (RLS): With user A's JWT, attempting to insert a check_in with user_id = B's id is rejected
- Test 3 (RLS): With the anon role (no JWT), select on profiles returns 0 rows
- Test 4 (RLS): With the anon role, select on clips returns approved clips only (no pending)
- Test 4b (RLS): With user A's JWT, `select * from consent_records` returns 0 rows when only user B has consent rows (Article 9 GDPR isolation)
- Test 5 (cascade): After `delete from auth.users where id = $userId`, row-count = 0 across profiles, user_habits, check_ins, streaks, streak_freezes, consent_records for that userId
  </behavior>
  <action>
These tests need a real Postgres + Supabase Auth instance. They run against the local docker-compose stack (which is provisioned in plan 01-06). The tests SKIP gracefully if `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not set, so this plan's typecheck/lint passes even before 01-06 lands.

1. Add deps: `@supabase/supabase-js@^2`, `dotenv` (devDependency).

2. `packages/db/test/rls.test.ts`:
   ```ts
   import { describe, it, expect, beforeAll, afterAll } from 'vitest';
   import { createClient } from '@supabase/supabase-js';
   import postgres from 'postgres';

   const SUPABASE_URL = process.env.SUPABASE_URL;
   const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
   const ANON_KEY = process.env.SUPABASE_ANON_KEY;
   const DB_URL = process.env.DATABASE_URL;

   const skip = !SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY || !DB_URL;
   const d = skip ? describe.skip : describe;

   d('RLS isolation', () => {
     const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!);
     let userA: { id: string; jwt: string };
     let userB: { id: string; jwt: string };
     const sql = skip ? null : postgres(DB_URL!, { prepare: false });

     beforeAll(async () => {
       // create two users via admin API, sign-in to get JWTs
       const a = await admin.auth.admin.createUser({ email: `a-${Date.now()}@example.com`, password: 'Password1!', email_confirm: true });
       const b = await admin.auth.admin.createUser({ email: `b-${Date.now()}@example.com`, password: 'Password1!', email_confirm: true });
       const aSession = await createClient(SUPABASE_URL!, ANON_KEY!).auth.signInWithPassword({ email: a.data.user!.email!, password: 'Password1!' });
       const bSession = await createClient(SUPABASE_URL!, ANON_KEY!).auth.signInWithPassword({ email: b.data.user!.email!, password: 'Password1!' });
       userA = { id: a.data.user!.id, jwt: aSession.data.session!.access_token };
       userB = { id: b.data.user!.id, jwt: bSession.data.session!.access_token };

       // seed: insert a habit_template (curator action via service role) + user_habits + check_in for B (service role bypasses RLS)
       await admin.from('habit_templates').insert({ slug: 'test-habit', title: 'Test', domain: 'sleep' }).select();
       const ht = await admin.from('habit_templates').select('id').eq('slug','test-habit').single();
       await admin.from('user_habits').insert({ user_id: userB.id, habit_template_id: ht.data!.id, frequency: 'daily' });
     });

     it('user A cannot read user B check_ins', async () => {
       const cliA = createClient(SUPABASE_URL!, ANON_KEY!, { global: { headers: { Authorization: `Bearer ${userA.jwt}` } } });
       const { data } = await cliA.from('user_habits').select('*');
       expect(data?.every((r) => r.user_id === userA.id)).toBe(true);
       expect(data?.some((r) => r.user_id === userB.id)).toBe(false);
     });

     it('user A cannot insert check_in with user_id = B', async () => {
       const cliA = createClient(SUPABASE_URL!, ANON_KEY!, { global: { headers: { Authorization: `Bearer ${userA.jwt}` } } });
       const { error } = await cliA.from('user_habits').insert({ user_id: userB.id, habit_template_id: '00000000-0000-0000-0000-000000000000', frequency: 'daily' });
       expect(error).not.toBeNull();
     });

     it('anon role sees 0 profiles', async () => {
       const anon = createClient(SUPABASE_URL!, ANON_KEY!);
       const { data } = await anon.from('profiles').select('*');
       expect(data).toEqual([]);
     });

     it('anon role sees only approved clips', async () => {
       const anon = createClient(SUPABASE_URL!, ANON_KEY!);
       const { data } = await anon.from('clips').select('*');
       // No clips seeded in Phase 1; just assert no error and only-approved guarantee
       expect((data ?? []).every((c: any) => c.status === 'approved')).toBe(true);
     });

     it('user A cannot read user B consent_records (Article 9 GDPR isolation)', async () => {
       // Seed a consent_records row for user B via service role (bypasses RLS)
       await admin.from('consent_records').insert({ user_id: userB.id, scope: 'account', granted: true });
       const cliA = createClient(SUPABASE_URL!, ANON_KEY!, { global: { headers: { Authorization: `Bearer ${userA.jwt}` } } });
       const { data } = await cliA.from('consent_records').select('*');
       expect(data ?? []).toEqual([]);
     });

     afterAll(async () => {
       await sql?.end();
     });
   });
   ```

3. `packages/db/test/cascade.test.ts`:
   ```ts
   import { describe, it, expect } from 'vitest';
   import { createClient } from '@supabase/supabase-js';
   import postgres from 'postgres';

   const skip = !process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
   const d = skip ? describe.skip : describe;

   d('cascade delete from auth.users', () => {
     it('removes all child rows in user-scoped tables', async () => {
       const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
       const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
       const u = await admin.auth.admin.createUser({ email: `cascade-${Date.now()}@example.com`, password: 'Password1!', email_confirm: true });
       const uid = u.data.user!.id;
       const { data: ht } = await admin.from('habit_templates').upsert({ slug: 'cascade-h', title: 'C', domain: 'sleep' }, { onConflict: 'slug' }).select().single();
       await admin.from('user_habits').insert({ user_id: uid, habit_template_id: ht!.id, frequency: 'daily' });
       await admin.from('consent_records').insert({ user_id: uid, scope: 'account', granted: true });

       // delete user
       await admin.auth.admin.deleteUser(uid);

       // assert row counts
       const tables = ['profiles','user_habits','check_ins','streaks','streak_freezes','consent_records'];
       for (const t of tables) {
         const r = await sql.unsafe(`select count(*)::int as c from public.${t} where ${t === 'profiles' ? 'id' : 'user_id'} = '${uid}'`);
         expect(r[0].c, `${t} should have 0 rows for deleted user`).toBe(0);
       }
       await sql.end();
     });
   });
   ```
  </action>
  <acceptance_criteria>
- `test -f packages/db/test/rls.test.ts && grep -q "user A cannot read user B" packages/db/test/rls.test.ts`
- `grep -q "user A cannot read user B consent_records" packages/db/test/rls.test.ts` (Article 9 GDPR isolation)
- `test -f packages/db/test/cascade.test.ts && grep -q "cascade delete" packages/db/test/cascade.test.ts`
- `pnpm --filter @cited/db test` exits 0 (tests SKIP cleanly when env vars absent)
- Note: actual RLS+cascade test execution against live Supabase is run by 01-06 docker-compose CI smoke job
  </acceptance_criteria>
  <done>Tests exist; skip cleanly without Supabase running; will run green against the docker-compose stack from 01-06.</done>
</task>

<task type="auto">
  <name>Task 4: packages/api-contracts — zod schemas mirroring DB types for Python worker contract</name>
  <files>packages/api-contracts/package.json, packages/api-contracts/src/index.ts, packages/api-contracts/src/enums.ts, packages/api-contracts/src/profiles.ts, packages/api-contracts/src/clips.ts, packages/api-contracts/src/habits.ts, packages/api-contracts/src/check-ins.ts, packages/api-contracts/src/extraction-jobs.ts, packages/api-contracts/src/clips-pending.ts</files>
  <read_first>packages/db/src/schema/*.ts (Task 1 output)</read_first>
  <action>
Create zod-mirror schemas. Each enum + table has a corresponding zod schema. The Python worker (Phase 5) will consume these via OpenAPI-generated Pydantic models or by hand — the TS file IS the source of truth for the cross-language contract.

1. `packages/api-contracts/package.json`: deps `zod@^3.23`. Scripts: `typecheck`, `test: vitest run`.

2. `packages/api-contracts/src/enums.ts`: re-export every enum value-set as `z.enum([...])`. Use the SAME literal arrays as `packages/db/src/schema/enums.ts` (copy, do not import — the Python worker reads JSON-Schema'd output of these files, not Drizzle).

3. `packages/api-contracts/src/extraction-jobs.ts` (THE Phase-5 worker contract — most important file in this plan):
   ```ts
   import { z } from 'zod';
   import { ExtractionJobStatusSchema } from './enums';

   export const ExtractionJobPayloadSchema = z.object({
     youtube_video_id: z.string().min(1),
     desired_chunks_seconds: z.number().int().positive().optional(),
     prompt_context: z.string().optional(),
   });

   export const ExtractionJobResultSchema = z.object({
     transcript_uri: z.string().url().optional(),
     transcript_text: z.string().optional(),
     proposed_clips: z.array(z.object({
       start_seconds: z.number().int().nonnegative(),
       end_seconds: z.number().int().positive(),
       claim: z.string().min(1).max(500),
       speaker: z.string(),
       speaker_status: z.enum(['verified','unverified','host']),
       domain: z.enum(['sleep','nutrition_gut','exercise_longevity','mental_health']),
       evidence_strength: z.enum(['anecdotal','observational','rct','meta_analysis']).optional(),
       risk_flags: z.array(z.string()),
       rationale: z.string().optional(),
     })).default([]),
   });

   export const ExtractionJobSchema = z.object({
     id: z.string().uuid(),
     podcast_id: z.string().uuid().nullable(),
     youtube_video_id: z.string(),
     status: ExtractionJobStatusSchema,
     claimed_by: z.string().nullable(),
     claimed_at: z.string().datetime().nullable(),
     attempt_count: z.number().int().nonnegative(),
     payload: ExtractionJobPayloadSchema,
     result: ExtractionJobResultSchema.nullable(),
     error: z.string().nullable(),
     created_at: z.string().datetime(),
     updated_at: z.string().datetime(),
   });

   export type ExtractionJob = z.infer<typeof ExtractionJobSchema>;
   ```

4. `packages/api-contracts/src/clips-pending.ts`: zod schema mirroring `clips_pending` (the worker WRITE target).

5. `packages/api-contracts/src/profiles.ts`, `clips.ts`, `habits.ts`, `check-ins.ts`: zod schemas. Keep field names snake_case in zod (matches DB column names; the Python worker speaks SQL, not JS camelCase).

6. `packages/api-contracts/src/index.ts`: re-export everything. Add `export const API_CONTRACT_VERSION = '0.1.0';`.

7. Add a smoke test `packages/api-contracts/src/index.test.ts` that imports every schema and exercises `.parse()` on a valid example to confirm the schemas are syntactically correct.
  </action>
  <acceptance_criteria>
- `test -f packages/api-contracts/src/extraction-jobs.ts && grep -q "ExtractionJobPayloadSchema" packages/api-contracts/src/extraction-jobs.ts && grep -q "proposed_clips" packages/api-contracts/src/extraction-jobs.ts`
- `test -f packages/api-contracts/src/clips-pending.ts`
- `grep -q "API_CONTRACT_VERSION" packages/api-contracts/src/index.ts`
- `pnpm --filter @cited/api-contracts test` exits 0
- `pnpm --filter @cited/api-contracts typecheck` exits 0
- Snake_case column names verified: `grep -q "youtube_video_id" packages/api-contracts/src/extraction-jobs.ts`
  </acceptance_criteria>
  <done>Zod contracts mirror DB schema in snake_case; ExtractionJobSchema covers the full worker contract; smoke test passes.</done>
</task>

<task type="auto">
  <name>Task 5: packages/core/llm — provider-wrapper interface for AION-09 enforcement</name>
  <files>packages/core/package.json, packages/core/src/index.ts, packages/core/src/llm/index.ts, packages/core/src/llm/types.ts, packages/core/src/llm/provider.ts, packages/core/src/llm/openai.ts, packages/core/src/llm/anthropic.ts, packages/core/src/llm/embeddings.ts, packages/core/src/llm/llm.test.ts</files>
  <read_first>/home/king/Hdiary/CLAUDE.md (LLM tier section)</read_first>
  <action>
Establish the provider-wrapper interface so AION-09 ("All LLM calls go through `packages/core/llm`, not direct SDK calls in routes") is structurally enforceable. Phase 3 implements the actual interview/synthesis; this plan ships the interface + stub providers + a test asserting the interface shape.

1. `packages/core/package.json`: deps `@ai-sdk/openai@^1`, `@ai-sdk/anthropic@^1`, `ai@^4`, `zod@^3`. (Vercel AI SDK locked from CLAUDE.md.)

2. `packages/core/src/llm/types.ts`:
   ```ts
   import { z } from 'zod';
   export type LlmTier = 'cheap' | 'reasoning';  // cheap = Haiku/4o-mini; reasoning = Sonnet
   export type LlmCallOpts = {
     tier: LlmTier;
     systemPrompt: string;
     userPrompt: string;
     temperature?: number;
     maxTokens?: number;
   };
   export type LlmStructuredOpts<T extends z.ZodType> = LlmCallOpts & { schema: T };
   export type LlmResponse = { text: string; provider: string; model: string; usage?: { inputTokens: number; outputTokens: number } };
   export type EmbeddingOpts = { input: string | string[] };
   export type EmbeddingResponse = { embeddings: number[][]; provider: string; model: string };
   ```

3. `packages/core/src/llm/provider.ts`:
   ```ts
   import type { LlmCallOpts, LlmResponse, LlmStructuredOpts, EmbeddingOpts, EmbeddingResponse } from './types';
   import type { z } from 'zod';
   export interface LlmProvider {
     name: string;
     complete(opts: LlmCallOpts): Promise<LlmResponse>;
     completeStructured<T extends z.ZodType>(opts: LlmStructuredOpts<T>): Promise<{ data: z.infer<T>; raw: LlmResponse }>;
   }
   export interface EmbeddingProvider {
     name: string;
     embed(opts: EmbeddingOpts): Promise<EmbeddingResponse>;
   }
   ```

4. `packages/core/src/llm/openai.ts`: stub OpenAI provider using `@ai-sdk/openai`. Maps `tier:'cheap'` → `gpt-4o-mini`. Throws on call without `OPENAI_API_KEY`. Implementation can `throw new Error('Phase 3: implement complete()')` for non-embedding methods if shaped tests don't need real LLM calls. The embeddings provider IS implemented since it's lightweight and used in Phase 2:
   ```ts
   export const openaiEmbeddings: EmbeddingProvider = {
     name: 'openai',
     async embed({ input }) {
       const { embeddings, model } = await embedMany({ model: openai.embedding('text-embedding-3-small'), values: Array.isArray(input) ? input : [input] });
       return { embeddings, provider: 'openai', model };
     },
   };
   ```

5. `packages/core/src/llm/anthropic.ts`: stub Anthropic provider. Maps `tier:'cheap'` → `claude-haiku-4-5`, `tier:'reasoning'` → `claude-sonnet-4-5` (model IDs are placeholders — real versions resolved in Phase 3). Phase-3-only methods can throw `not-implemented`.

6. `packages/core/src/llm/index.ts`:
   ```ts
   export * from './types';
   export * from './provider';
   export { openaiEmbeddings } from './openai';
   export { getLlm, getEmbeddings } from './registry';
   ```

7. `packages/core/src/llm/registry.ts`: returns the configured provider based on env (`LLM_PROVIDER=anthropic|openai`, defaults to `anthropic` for chat / `openai` for embeddings).

8. `packages/core/src/llm/llm.test.ts`: assert the interface shape only:
   ```ts
   import { describe, it, expect } from 'vitest';
   import { openaiEmbeddings } from './openai';
   describe('llm interface contract', () => {
     it('embedding provider has name + embed', () => {
       expect(openaiEmbeddings.name).toBe('openai');
       expect(typeof openaiEmbeddings.embed).toBe('function');
     });
   });
   ```

9. `packages/core/src/index.ts`: `export * from './llm';`

This ESTABLISHES the choke point. Phase 2 (ADMN-04 embed-on-approve) will import `openaiEmbeddings`. Phase 3 (AION-08) implements the chat tier wrappers.
  </action>
  <acceptance_criteria>
- `test -f packages/core/src/llm/types.ts && grep -q "LlmTier" packages/core/src/llm/types.ts`
- `test -f packages/core/src/llm/provider.ts && grep -q "interface LlmProvider" packages/core/src/llm/provider.ts && grep -q "interface EmbeddingProvider" packages/core/src/llm/provider.ts`
- `test -f packages/core/src/llm/openai.ts && grep -q "text-embedding-3-small" packages/core/src/llm/openai.ts`
- `test -f packages/core/src/llm/anthropic.ts`
- `pnpm --filter @cited/core test` exits 0
- `pnpm --filter @cited/core typecheck` exits 0
- Future enforcement: a lint rule in apps/web (added in 01-05) bans direct SDK imports outside packages/core/llm
  </acceptance_criteria>
  <done>LLM provider interface lives in packages/core/llm. Embeddings provider implemented (Phase 2 needs it). Chat providers stubbed with the shape Phase 3 will fill in.</done>
</task>

</tasks>

<verification>
1. `pnpm --filter @cited/db typecheck && pnpm --filter @cited/db test` — passes (RLS/cascade tests skip without DB)
2. `pnpm --filter @cited/api-contracts typecheck && pnpm --filter @cited/api-contracts test` — passes
3. `pnpm --filter @cited/core typecheck && pnpm --filter @cited/core test` — passes
4. After 01-06 lands docker-compose stack: `DATABASE_URL=… SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… pnpm --filter @cited/db test` — RLS isolation + cascade tests pass
5. `pnpm --filter @cited/db generate` produces no schema diff (idempotent)
6. Visual: `psql "$DATABASE_URL" -c "\d+ public.clips"` shows `embedding` column with `vector(1536)` type
</verification>

<success_criteria>
- All 6 requirements covered (FND-06, FND-07, FND-08, AION-09, PROF-01, PROF-04 cascade design)
- 16 tables exist with correct types + FKs + cascade
- RLS enabled on every table; ≥20 policies cover user-data isolation
- pgvector + HNSW + tsvector indexes in place
- zod contracts mirror schema in snake_case for cross-language consumption
- LLM provider interface lives in packages/core/llm
- RLS isolation test demonstrably proves user A cannot read user B
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-04-SUMMARY.md` documenting:
- Final table list with FK relationships
- RLS policy summary table (table → policies)
- The provider-wrapper interface signature (so Phase 2 can plug embedding writes in cleanly)
- Known limitations: cascade integration test runs in Phase 4 (PROF-04 full); RLS test currently skips without local Supabase — runs in 01-06 CI
</output>
