---
phase: 02-curation-tooling-doac-corpus
plan: 03
subsystem: ingestion-pipeline
tags: [embeddings, openai, chunking, ingestion, drizzle, server-action, route-handler, zod, tdd]
requires:
  - "02-01: transcripts/transcript_chunks/episode_blacklist/podcasts schemas + pgvector(1536) column"
  - "02-02: fetchTranscript() orchestrator + extractVideoId() + manual/youtube providers"
  - "Phase 1: getSessionUser() (role-aware), createDb(), getEmbeddings() (OpenAI text-embedding-3-small)"
provides:
  - "chunkTranscript(words, opts?) — 512-token sliding window with 64-token overlap, word-boundary timestamps"
  - "embedClip({claim, rationale?}) — single 1536-dim vector for ADMN-04 embed-on-approve"
  - "embedTranscriptChunks(texts) — batched at BATCH_SIZE=100, throws on wrong dimensionality"
  - "__set{Chunk,Clip}EmbeddingsImpl test seam (mirrors transcripts/* convention)"
  - "addPodcast(input) server action — ADMN-16 curator-gated inline source add"
  - "ingestUrlSchema / addPodcastSchema / manualTranscriptSchema + domain/speakerStatus/riskFlag zod enums"
  - "POST /api/admin/ingest route handler — full pipeline (URL or VTT/SRT → transcript → chunks → embeddings → persistence)"
affects:
  - "02-04 AI co-pilot: consumes transcript_chunks for context retrieval"
  - "02-05 review/approve flow: consumes embedClip for the embed-on-approve step"
  - "02-06 fixture seeding: uses the same ingestion route to load AION-10 candidates"
  - "Phase 3 onboarding RAG: ingested-but-unclipped episodes already searchable via transcript_chunks once this lands"
tech-stack:
  added: []
  patterns:
    - "Per-module test seam (__setEmbeddingsImpl) — same shape as transcripts/youtube.__setYoutubeFetchImpl; keeps mock injection local instead of monkey-patching the registry"
    - "Drizzle fluent-chain mock in route.test — Object.assign(Promise, builder) pattern for awaitable+chainable; onConflictDoUpdate routed through apply() to dedupe on natural keys (mimics upsert)"
    - "Singleton db() closure inside route + server action — DATABASE_URL read lazily so test-only env can be set in beforeEach"
key-files:
  created:
    - "apps/web/lib/curate/chunking.ts"
    - "apps/web/lib/curate/chunking.test.ts"
    - "packages/core/src/embeddings/embedClip.ts"
    - "packages/core/src/embeddings/embedClip.test.ts"
    - "packages/core/src/embeddings/embedTranscriptChunks.ts"
    - "packages/core/src/embeddings/embedTranscriptChunks.test.ts"
    - "packages/core/src/embeddings/index.ts"
    - "apps/web/app/actions/curate/schemas.ts"
    - "apps/web/app/actions/curate/addPodcast.ts"
    - "apps/web/app/actions/curate/addPodcast.test.ts"
    - "apps/web/app/api/admin/ingest/route.ts"
    - "apps/web/app/api/admin/ingest/route.test.ts"
  modified:
    - "packages/core/src/index.ts"
    - "vitest.config.ts"
decisions:
  - "Test seam at the embedder-module level rather than registry monkey-patch (plan suggested mutating registry.getEmbeddings) — preserves a stable public registry API, matches the already-shipped transcripts/* test seam, and avoids re-evaluating the plan's awkward 'rename existing fn' adaptation"
  - "Curate test-imports use @/ alias — added a vitest.config.ts resolve.alias for @/ → apps/web/ so server-side routes/actions can keep their tsconfig path imports under test. One-line config change, no per-test path-juggling"
  - "DB mock simulates onConflictDoUpdate as natural-key dedupe (youtubeVideoId for episodes, videoId for transcripts) so re-ingest idempotency can be tested without an actual Postgres — the upstream Drizzle types remain authoritative for the production path"
  - "url-path picks first podcasts row as fallback (Phase 2 single-curator + ADMN-16 inline add covers brand-new sources); explicit 422 if podcasts is empty rather than silently failing"
metrics:
  duration: "~30 min"
  completed: "2026-05-12"
  tasks: 3
  commits: 3
  files: 14
---

# Phase 02 Plan 03: Transcript Ingestion Pipeline + Embedding Utilities Summary

Landed the data flow that makes the DOAC corpus searchable before clips are extracted: a curator-gated `POST /api/admin/ingest` route handler runs Plan 02's `fetchTranscript()` orchestrator over either a YouTube URL or a pasted VTT/SRT body, persists the transcript, chunks it via a 512/64-token sliding window, batches embeddings through OpenAI `text-embedding-3-small` at 100 inputs per call, and writes 1536-dim vectors into `transcript_chunks`. Re-ingest is idempotent (delete-and-reinsert chunks; upsert on episodes + transcripts). The ADMN-16 inline "add podcast" server action is wired so curators can add a brand-new source from the ingestion form. AION-09 wrapper rule preserved end-to-end — no direct `@ai-sdk/openai` imports in `apps/web/lib/curate/` or `packages/core/src/embeddings/`.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | chunkTranscript + embedClip + embedTranscriptChunks (batched 100, TDD, 12 tests) | `aea7830` | chunking.ts/.test.ts, embedClip.ts/.test.ts, embedTranscriptChunks.ts/.test.ts, embeddings/index.ts, core/src/index.ts |
| 2 | addPodcast server action + shared curate zod schemas (ADMN-16, TDD, 5 tests) | `ffac05c` | actions/curate/schemas.ts, addPodcast.ts, addPodcast.test.ts, vitest.config.ts |
| 3 | POST /api/admin/ingest route — URL or manual upload → transcript → chunks → embeddings (ADMN-12+13, TDD, 5 tests) | `8127a7d` | api/admin/ingest/route.ts, route.test.ts |

## Verification

- `pnpm --filter @cited/core exec vitest run` — 36/36 tests pass (8 files; 7 new embedding/chunking)
- `pnpm exec vitest run apps/web/` — 29/29 tests pass (5 chunking + 5 addPodcast + 5 route + 14 pre-existing)
- `pnpm --filter @cited/web exec tsc --noEmit` — exits 0
- `pnpm --filter @cited/core exec tsc --noEmit` — exits 0
- `pnpm exec biome check` on all new/changed files — clean
- AION-09 wrapper rule: `grep -rn "@ai-sdk/openai\|from 'openai'" packages/core/src/embeddings/ apps/web/lib/curate/ apps/web/app/api/admin/ingest/ apps/web/app/actions/curate/` — no matches
- Acceptance greps from PLAN.md all return matches (export function chunkTranscript, embedClip, BATCH_SIZE = 100, export * from './embeddings', export async function POST, episodeBlacklist+fetchTranscript+embedTranscriptChunks in route)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Workspace naming] Plan imports use `@hdiary/*`; actual workspace is `@cited/*`**
- **Found during:** Task 1 (carried through all tasks)
- **Issue:** Plan template imports `@hdiary/core` and `@hdiary/db`; same drift documented in 02-01 and 02-02 SUMMARYs — project renamed to Cited pre–Phase 1.
- **Fix:** Used `@cited/core` and `@cited/db` everywhere. No semantic change.
- **Files affected:** All Task 1-3 files

**2. [Rule 1 — Bug] Plan's `registry.ts` mutation pattern conflicts with TS verbatimModuleSyntax/strict mode**
- **Found during:** Task 1
- **Issue:** Plan asked the executor to mutate `packages/core/src/llm/registry.ts` — rename existing `getEmbeddings` to `_realGetEmbeddings` and re-export a wrapper that consults a module-level `_override`. The project ships `verbatimModuleSyntax: true` + `noImplicitOverride: true` + a stable `getLlm/getEmbeddings` public surface that downstream packages already import. Mutating that surface for a test seam is invasive and risks downstream `import type` breakage.
- **Fix:** Pivoted to the **same test-seam pattern already in use by `packages/core/src/transcripts/{youtube,deepgram}.ts`** — module-scope `let embeddingsImpl = () => getEmbeddings();` + an exported `__setEmbeddingsImpl()` per embedder. Local, no public-API mutation, and consistent with the existing transcripts convention.
- **Files modified:** `packages/core/src/embeddings/embedClip.ts`, `embedTranscriptChunks.ts`, `embeddings/index.ts`
- **Commit:** `aea7830`

**3. [Rule 3 — Blocking] Vitest had no @/ alias; @/lib/auth/guards failed to resolve under test**
- **Found during:** Task 2
- **Issue:** Tests for `apps/web/app/actions/curate/addPodcast.ts` import `@/lib/auth/guards` (Phase 1 path-alias). Vitest at the repo root had no resolve.alias for `@/`, so the first run blew up with `Failed to resolve import "@/lib/auth/guards"`.
- **Fix:** Added one alias entry to root `vitest.config.ts`: `'@/': ${resolve(__dirname, 'apps/web')}/`. Mirrors `apps/web/tsconfig.json`'s `paths`. Unblocks both Task 2 and Task 3 tests; no production-code impact.
- **Files modified:** `vitest.config.ts`
- **Commit:** `ffac05c`

**4. [Rule 1 — Bug] Plan's `ingestUrlSchema.refine` allowed both url AND manualTranscript**
- **Found during:** Task 2
- **Issue:** Plan template used `!!d.url || !!d.manualTranscript` which accepts when *either* is set, including both. That would let curators bypass the explicit manual-upload prompt by sending both — semantically ambiguous and lets the route's `parsed.data.url ? ... : ...` branch silently win.
- **Fix:** Tightened to `Boolean(d.url) !== Boolean(d.manualTranscript)` (XOR), with the matching error message "Provide exactly one of: url, manualTranscript". Plain zod refine; no API surface change.
- **Files modified:** `apps/web/app/actions/curate/schemas.ts`
- **Commit:** `ffac05c`

**5. [Rule 1 — Bug] Plan's `youtubeVideoId` schema accepted any 11-char string**
- **Found during:** Task 2
- **Issue:** Plan template used `z.string().min(11).max(11)`. YouTube IDs are URL-safe base64 (A-Za-z0-9_-), not arbitrary characters. The Plan 02 `extractVideoId()` already enforces the regex; doubled it here for defense-in-depth so manual-path body validation doesn't accept e.g. `"!!!@@@##$$%"`.
- **Fix:** `z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'youtubeVideoId must be the 11-char YouTube ID')`.
- **Files modified:** `apps/web/app/actions/curate/schemas.ts`
- **Commit:** `ffac05c`

### Test Behavior Adjustment

- **Manual VTT test fixture:** Plan asked for "VTT content"; minimum valid content needs ≥50 chars after the WEBVTT header to pass `manualTranscriptSchema`'s `content: z.string().min(50)`. Used a hand-rolled WEBVTT with a single 50+ char cue. Behavior identical; fixture realistic.

## Auth Gates

None. `getSessionUser` is fully mocked in tests; no live Supabase session needed. The real route relies on Phase 1's Supabase Auth + RLS. `OPENAI_API_KEY` is referenced indirectly through `getEmbeddings()` but the test seam injects a mock embedder before the real provider is reached — no live OpenAI key required to land or test this plan.

## Out-of-Scope Discoveries (Deferred)

- `Cited-design-reference/` directory and `compass_artifact_…markdown.md` remain untracked at repo root — pre-existing across all Phase 2 plans, untouched.
- `pnpm-lock.yaml` and `.planning/config.json` show as modified pre-execution — left as-is.

## Known Stubs

None. All exports are wired end-to-end:
- `chunkTranscript`, `embedClip`, `embedTranscriptChunks` are real production utilities (not mocks). The `__setEmbeddingsImpl` test seam is **only** for tests — production paths call `getEmbeddings()` directly.
- `addPodcast` writes a real INSERT through Drizzle to the `podcasts` table.
- `POST /api/admin/ingest` runs the full pipeline end-to-end and is the canonical consumer for Plan 02's `fetchTranscript`. The mocks in `route.test.ts` exist only to keep tests hermetic — the production code path is unmocked.
- `fetchTranscript({url})` for the YouTube path throws the curator-facing "upload a manual transcript" error in Phase 2 when captions are missing — that's not a stub, it's the documented Phase 2 limitation surfacing per `02-CONTEXT.md` (audio extraction is Phase 5).

## Self-Check: PASSED

Verified files exist:
- `apps/web/lib/curate/chunking.ts` — FOUND
- `apps/web/lib/curate/chunking.test.ts` — FOUND
- `packages/core/src/embeddings/embedClip.ts` — FOUND
- `packages/core/src/embeddings/embedClip.test.ts` — FOUND
- `packages/core/src/embeddings/embedTranscriptChunks.ts` — FOUND
- `packages/core/src/embeddings/embedTranscriptChunks.test.ts` — FOUND
- `packages/core/src/embeddings/index.ts` — FOUND
- `apps/web/app/actions/curate/schemas.ts` — FOUND
- `apps/web/app/actions/curate/addPodcast.ts` — FOUND
- `apps/web/app/actions/curate/addPodcast.test.ts` — FOUND
- `apps/web/app/api/admin/ingest/route.ts` — FOUND
- `apps/web/app/api/admin/ingest/route.test.ts` — FOUND

Verified commits exist:
- `aea7830` — FOUND (Task 1)
- `ffac05c` — FOUND (Task 2)
- `8127a7d` — FOUND (Task 3)
