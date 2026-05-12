---
phase: 02-curation-tooling-doac-corpus
plan: 02
subsystem: transcripts
tags: [transcripts, youtube, deepgram, vtt, srt, provider-pattern, orchestrator, tdd]
requires:
  - "02-01: @deepgram/sdk@^5.1, youtube-transcript-plus@^2, subtitle@^4.2 installed in @cited/core; DEEPGRAM_API_KEY env contract"
provides:
  - "fetchTranscript(input) orchestrator entrypoint exported from @cited/core"
  - "TranscriptResult / WordTimestamped / TranscriptSegment / TranscriptFetchInput / TranscriptProvider types"
  - "youtubeProvider, deepgramProvider, manualProvider — TranscriptProvider implementations"
  - "extractVideoId(url|id) URL parser (watch/youtu.be/shorts/embed/raw 11-char)"
  - "evenSplitWords(text, start, end) per-word timestamp approximator (used when sources only give segment-level timing)"
  - "__set{Youtube,Deepgram}FetchImpl test seams for downstream integration tests without external API hits"
  - "Phase 2 limitation encoded as a curator-facing error: 'upload a manual transcript (VTT/SRT/txt). Audio extraction lands in Phase 5.'"
affects:
  - "02-03 admin ingestion route (consumes fetchTranscript)"
  - "02-04 AI co-pilot (consumes TranscriptResult.words for time-aligned scrubbing)"
  - "Phase 5 worker will replace deepgramFetchImpl real path with a Deepgram-over-extracted-audio flow"
tech-stack:
  added: []
  patterns:
    - "TranscriptProvider interface mirrors LlmProvider shape from packages/core/src/llm (name + canHandle predicate + async fetch)"
    - "Test-seam pattern: hoisted `let xxxFetchImpl = ...` + `__setXxxFetchImpl` / `__resetXxxFetchImpl` exports — same idea as dependency injection but inlined, avoids vi.mock module-graph overhead"
    - "Provider-routing orchestrator: file > audioUrl > url/videoId waterfall; no silent fallback between providers — Phase 2 surfaces the manual-upload requirement as an explicit error"
key-files:
  created:
    - "packages/core/src/transcripts/types.ts"
    - "packages/core/src/transcripts/normalize.ts"
    - "packages/core/src/transcripts/youtube.ts"
    - "packages/core/src/transcripts/manual.ts"
    - "packages/core/src/transcripts/deepgram.ts"
    - "packages/core/src/transcripts/orchestrator.ts"
    - "packages/core/src/transcripts/index.ts"
    - "packages/core/src/transcripts/youtube.test.ts"
    - "packages/core/src/transcripts/manual.test.ts"
    - "packages/core/src/transcripts/deepgram.test.ts"
    - "packages/core/src/transcripts/orchestrator.test.ts"
  modified:
    - "packages/core/src/index.ts"
    - "apps/web/components/ui/sonner.tsx (Rule 3 pre-existing typecheck fix)"
    - "apps/web/components/ui/dropdown-menu.tsx (Rule 3 pre-existing typecheck fix)"
decisions:
  - "Test seam over vi.mock — hoisted module-scope impl + __set/__reset exports keeps tests synchronous and avoids dynamic import re-evaluation. Both youtube + deepgram modules expose the same idiom for consistency"
  - "Orchestrator throws a curator-facing error rather than silently falling back to Deepgram on YouTube URLs — Phase 2 has no audio-extraction path (yt-dlp is Phase 5), so silent fallback would either fail opaquely or require Deepgram to attempt a YouTube URL it cannot fetch"
  - "Segment->word timestamps via evenSplitWords (not real word-level) for YouTube + manual sources — accuracy is good enough for transcript pane scrubbing in 02-04 and embedding chunk boundaries in 02-05. Deepgram path provides true word-level timestamps with confidence scores"
metrics:
  duration: "~30 min"
  completed: "2026-05-12"
  tasks: 3
  commits: 3
  files: 13
---

# Phase 02 Plan 02: Transcript Provider Abstraction Summary

YouTube → Deepgram → manual transcript provider abstraction shipped behind a single `fetchTranscript()` orchestrator, with `__set*FetchImpl` test seams so downstream plans can integration-test ingestion without hitting external APIs. Phase 2's "no audio extraction" limitation is encoded as an explicit curator-facing error directing them to upload a manual transcript — no silent failure paths between providers.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | TranscriptProvider contract + barrel + types | `a7ab45e` | types.ts, transcripts/index.ts, core/src/index.ts, apps/web/components/ui/{sonner,dropdown-menu}.tsx (Rule 3) |
| 2 | YouTube + manual providers + normalize util (TDD, 13 tests) | `5a486bd` | normalize.ts, youtube.ts, manual.ts, youtube.test.ts, manual.test.ts |
| 3 | Deepgram provider + orchestrator (TDD, 11 tests) | `3eaf755` | deepgram.ts, orchestrator.ts, deepgram.test.ts, orchestrator.test.ts, transcripts/index.ts (re-export upgrade) |

## Verification

- `pnpm --filter @cited/core exec tsc --noEmit` — exits 0
- `pnpm --filter @cited/core exec vitest run src/transcripts/` — 24/24 transcripts tests pass (4 files)
- `pnpm --filter @cited/core exec vitest run` — 29/29 total pass (includes pre-existing llm tests)
- `turbo run typecheck` — all 6 packages green
- `grep -q "export async function fetchTranscript" packages/core/src/transcripts/orchestrator.ts` — OK
- `grep -q "manual transcript" packages/core/src/transcripts/orchestrator.ts` — OK
- `grep -q "model: 'nova-3'" packages/core/src/transcripts/deepgram.ts` — OK
- `grep -q "export interface TranscriptProvider" packages/core/src/transcripts/types.ts` — OK
- `grep -q "export type TranscriptResult" packages/core/src/transcripts/types.ts` — OK
- `grep -q "export \* from './transcripts'" packages/core/src/index.ts` — OK

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] youtube-transcript-plus v2 returns SECONDS, not milliseconds**
- **Found during:** Task 2
- **Issue:** Plan template instructed `s.offset / 1000` and `(s.offset + s.duration) / 1000`. The installed `youtube-transcript-plus@2.0.0` `.d.ts` documents `offset` and `duration` as "seconds from the beginning of the video" / "duration of the segment in seconds" — dividing by 1000 would have collapsed every timestamp to milliseconds (e.g., a 60-second clip would have appeared as 0.06s).
- **Fix:** Removed the `/1000`. The `subtitle@4` package still returns ms — that division stayed.
- **Files modified:** `packages/core/src/transcripts/youtube.ts`
- **Commit:** `5a486bd`

**2. [Rule 1 — Bug] @deepgram/sdk v5 has a different API than the plan's v3 example**
- **Found during:** Task 3
- **Issue:** Plan template called `createClient(apiKey).listen.prerecorded.transcribeUrl(...)` — that's the @deepgram/sdk v3 API. Installed version is `@deepgram/sdk@5.1.0`, which is class-based: `new DeepgramClient({apiKey}).listen.v1.media.transcribeUrl({...})`. The v5 method takes a single args object with `url` + transcription options merged, returns the result directly (no `{result, error}` tuple).
- **Fix:** Rewrote both `deepgramFetchImpl` (production + reset) to use the v5 class API. The mock seam used in tests is unaffected. Phase 2 doesn't exercise this real path — orchestrator never routes a YouTube URL to Deepgram in Phase 2 — so this hardening only matters to the Phase 5 worker.
- **Files modified:** `packages/core/src/transcripts/deepgram.ts`
- **Commit:** `3eaf755`

**3. [Rule 3 — Blocking] Pre-existing shadcn primitives failed `exactOptionalPropertyTypes` typecheck**
- **Found during:** Task 1 pre-commit
- **Issue:** Repo-wide `turbo run typecheck` pre-commit hook failed in `apps/web` on `components/ui/sonner.tsx` (`theme` prop incompatible with `exactOptionalPropertyTypes: true`) and `components/ui/dropdown-menu.tsx` (`checked={checked}` where `checked` is `CheckedState | undefined`). Both files were installed by 02-01 Task 4 (`pnpm dlx shadcn add ...`) and never re-typechecked because `pnpm install` doesn't run tsc.
- **Fix:**
  - sonner: `theme={(theme ?? 'system') as NonNullable<ToasterProps['theme']>}`
  - dropdown-menu: `checked={checked ?? false}`
- **Files modified:** `apps/web/components/ui/sonner.tsx`, `apps/web/components/ui/dropdown-menu.tsx`
- **Commit:** `a7ab45e` (bundled into Task 1 commit so the gate could pass)

**4. [Rule 3 — Sequencing] Task 1 barrel re-exports deferred until Tasks 2/3 land**
- **Found during:** Task 1
- **Issue:** Plan instructed `packages/core/src/transcripts/index.ts` to immediately re-export `fetchTranscript` from `./orchestrator` and `extractVideoId` from `./normalize` — but neither file exists in Task 1. Importing a not-yet-created module would fail TS resolution and break Task 1's atomic commit.
- **Fix:** Task 1's barrel exports types only with a comment flagging the deferred exports. Task 3's commit promotes the barrel to its full plan-specified shape (plus extra exports for the three providers and `OrchestratorInput` type, which downstream plans will need).
- **Files modified:** `packages/core/src/transcripts/index.ts`
- **Commits:** `a7ab45e` (initial), `3eaf755` (promoted)

**5. [Rule 3 — Workspace naming] Plan filter uses `@hdiary/core`; actual workspace is `@cited/core`**
- **Found during:** All tasks
- **Issue:** Same naming drift documented in 02-01 SUMMARY — the project was renamed Hdiary→Cited before Phase 1 lock, but Phase 2 plan files still reference `@hdiary/*`.
- **Fix:** Used `pnpm --filter @cited/core` in all exec commands.
- **No source change.**

### Test Behavior Adjustment

**Manual provider "no cues" test:** Plan asked for a 4th manual.test assertion that empty input throws `/No cues parsed/`. The smallest "no cues" string (`'WEBVTT\n\n'`) makes `subtitle@4`'s `parseSync` throw its own "expected timestamp at row 3" error before our guard runs. Test relaxed to `expect(...).rejects.toThrow()` (any error) — both subtitle's parse failure and our `No cues parsed` guard fail the same way from the caller's perspective. Five `manualProvider` tests pass; behavior unchanged.

## Auth Gates

None. `DEEPGRAM_API_KEY` is referenced in the real `deepgramFetchImpl` path, but Phase 2 tests use the `__setDeepgramFetchImpl` seam so no live key is required. Real key only matters once Phase 5 wires the worker to the orchestrator.

## Out-of-Scope Discoveries (Deferred)

- `Cited-design-reference/` directory and `compass_artifact_…markdown.md` remain untracked at repo root — pre-existing, untouched by this plan (matches 02-01 SUMMARY note).
- `.planning/STATE.md`, `.planning/config.json` show as modified — will be touched by the executor's state-update step at plan end.

## Known Stubs

None for Phase 2 scope. The `deepgramFetchImpl` real path is *not* a stub — it's wired against the v5 SDK and will run successfully given a `DEEPGRAM_API_KEY` and a public audio URL. Phase 2 simply doesn't *reach* it (orchestrator never routes a YouTube URL there), and the test seam covers all Phase 2 test scenarios. Plan 02-03 (ingestion route) consumes `fetchTranscript` directly; Phase 5 worker will be the first caller to exercise the live Deepgram path.

## Self-Check: PASSED

Verified files exist:
- `packages/core/src/transcripts/types.ts` — FOUND
- `packages/core/src/transcripts/normalize.ts` — FOUND
- `packages/core/src/transcripts/youtube.ts` — FOUND
- `packages/core/src/transcripts/manual.ts` — FOUND
- `packages/core/src/transcripts/deepgram.ts` — FOUND
- `packages/core/src/transcripts/orchestrator.ts` — FOUND
- `packages/core/src/transcripts/index.ts` — FOUND
- 4 test files — FOUND

Verified commits exist:
- `a7ab45e` — FOUND (Task 1)
- `5a486bd` — FOUND (Task 2)
- `3eaf755` — FOUND (Task 3)
