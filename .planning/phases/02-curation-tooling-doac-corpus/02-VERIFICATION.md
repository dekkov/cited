---
phase: 02-curation-tooling-doac-corpus
verified: 2026-05-12T01:00:00Z
status: gaps_found
score: 4/6 success criteria verified
re_verification: false
gaps:
  - truth: "≥30 clips are approved across the 4 domains with embeddings populated and zero hard-blocked clips"
    status: failed
    reason: "CURATION_TRACKER.md shows 0/0/0/0 approved clips across all 4 domains. The tooling is complete and fully wired, but no editorial curation sessions have occurred. ADMN-09 and SC3 both require the actual corpus content, not just the tooling."
    artifacts:
      - path: ".planning/phases/02-curation-tooling-doac-corpus/CURATION_TRACKER.md"
        issue: "Per-domain progress: sleep=0, nutrition_gut=0, exercise_longevity=0, mental_health=0, Total=0/≥30"
    missing:
      - "Editorial curation work: ≥7 approved clips per domain using the built tooling"
      - "Clips must have embeddings populated via approveClip(), speaker_status set, and no prescription/dosing/condition-treatment content"

  - truth: "A 20-transcript hand-graded hallucination eval set exists and CI runs it"
    status: failed
    reason: "REQUIREMENTS AION-10 and ROADMAP SC6 both require a '20-transcript hand-graded hallucination eval set.' Only 5 seed-stub fixtures exist in fixtures.jsonl, all marked reviewer='seed-stub' (synthetic placeholders). Plan 06 SUMMARY defers expansion to '≥20 by Phase 5' which contradicts the Phase 2 target."
    artifacts:
      - path: "tests/eval/aion-10/fixtures.jsonl"
        issue: "5 rows present, all reviewer='seed-stub'. REQUIREMENTS.md and ROADMAP SC6 require 20 hand-graded transcripts."
    missing:
      - "15 additional hand-graded fixture rows promoted from aion10_fixture_candidates or sourced from real DOAC episodes"
      - "Fixtures must be hand-graded by a human reviewer (not seed-stub)"

  - truth: "Health disclaimer renders on every habit card and onboarding flow shell"
    status: partial
    reason: "HealthDisclaimer component (LGL-01) exists and is wired to /legal/dmca. However, ROADMAP SC5 explicitly states 'Health disclaimer renders on every habit card and onboarding flow shell.' Habit cards do not exist until Phase 3 (expected), but the onboarding flow shell also does not render the HealthDisclaimer component — only a disclaimer_ack checkbox (AUTH-04). Plan 06 SUMMARY acknowledges HealthDisclaimer is 'scaffolded for Phase 3 habit cards' but the onboarding flow shell gap is unacknowledged."
    artifacts:
      - path: "apps/web/components/disclaimer/HealthDisclaimer.tsx"
        issue: "Component exists and is substantive but only wired to /legal/dmca. Habit cards (Phase 3) and onboarding flow shell do not render it."
      - path: "apps/web/app/(onboarding)/onboarding/legal-gate/legal-gate-form.tsx"
        issue: "Has disclaimer_ack checkbox (AUTH-04 flow) but does not render <HealthDisclaimer /> component"
    missing:
      - "<HealthDisclaimer variant='footer' /> or similar wired into the onboarding layout shell"
      - "Note: habit-card wiring is correctly deferred to Phase 3; only onboarding shell gap is a Phase 2 issue"
---

# Phase 2: Curation Tooling + DOAC Corpus — Verification Report

**Phase Goal:** A curator (the user, single curator at MVP) can ingest a YouTube URL or transcript document, use an AI co-pilot inside the clip editor to refine timestamps and claim wording, manually scrub-and-cut clips from ingested transcripts, and approve ≥30 clips across the 4 domains — every approval triggers an embedding write, mandatory risk flags, and an audit-log entry. The corpus is the binding constraint; this phase exists to dissolve it.

**Verified:** 2026-05-12T01:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Phase 2 Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Curator can paste YouTube URL or upload transcript; system fetches, persists, chunks + embeds into RAG corpus before any clips extracted | ✓ VERIFIED | `POST /api/admin/ingest` (176 lines, real pipeline); `fetchTranscript()` orchestrator wired; `embedTranscriptChunks()` called and inserts into `transcript_chunks`; 5 route tests pass |
| 2 | Curator can scrub through transcript, mark clip start/end, approve with risk flags; AI co-pilot inline; every AI suggestion + accept/reject recorded in clip_edits | ✓ VERIFIED | `TranscriptPane.tsx` with selection start/end wired; `approveClip.ts` 130 lines with transaction + hard-block + embed; `clip_edits` inserts for ai_suggested/ai_accepted/ai_rejected actions; streaming copilot route substantive (onFinish groundingCheck + audit row) |
| 3 | ≥30 clips approved across 4 domains with embeddings, speaker_status, zero hard-blocked | ✗ FAILED | CURATION_TRACKER.md: sleep=0, nutrition_gut=0, exercise_longevity=0, mental_health=0. Tooling is complete; no editorial curation has occurred. |
| 4 | Daily pg_cron oEmbed check flags unavailable episodes; admin can one-click remove+cascade | ✓ VERIFIED | `oembed-check/route.ts` with THRESHOLD=3 flap suppression (substantive, 90 lines); `migration 0007` with pg_cron schedule; `removeEpisodeAndBlacklist.ts` with blacklist upsert + cascade to clips; 5+3 tests pass |
| 5 | /legal/dmca published (48h SLA); one-click remove+blacklist exists; MEDICAL_REVIEW.md clip-length guidance; health disclaimer on habit cards and onboarding flow | ? PARTIAL | `/legal/dmca` exists with 48h SLA; LGL-03 `removeEpisodeAndBlacklist` wired; LGL-08 editorial guidance in MEDICAL_REVIEW.md verified. `HealthDisclaimer` component exists, wired to dmca page only. Onboarding flow shell does NOT render `<HealthDisclaimer />`. Habit card wiring correctly deferred to Phase 3. |
| 6 | 20-transcript hand-graded hallucination eval set exists; CI runs against current prompts | ✗ FAILED | 5 seed-stub fixtures in fixtures.jsonl (reviewer="seed-stub", synthetic). AION-10 CI gate and runner scaffolding are verified and substantive. The gap is the fixture count (5 vs 20 required by REQUIREMENTS.md + ROADMAP SC6). |

**Score:** 4/6 success criteria verified (2 failed, 1 partial)

---

## Required Artifacts

### Plan 01 — DB Schema

| Artifact | Status | Evidence |
|----------|--------|----------|
| `packages/db/src/schema/transcripts.ts` | ✓ VERIFIED | JSONB words column; tsvector GIN documented in SQL only (Drizzle limitation, by design) |
| `packages/db/src/schema/episode-blacklist.ts` | ✓ VERIFIED | LGL-03 table with youtubeVideoId unique constraint |
| `packages/db/src/schema/aion10-fixture-candidates.ts` | ✓ VERIFIED | Dev-only staging table for fixture promotion |
| `packages/db/migrations/0003_phase2_transcripts.sql` | ✓ VERIFIED | ENABLE ROW LEVEL SECURITY + 2 CREATE POLICY clauses |
| `packages/db/migrations/0004_phase2_clip_edits_extensions.sql` | ✓ VERIFIED | clip_edit_action enum + payload JSONB extension |
| `packages/db/migrations/0005_phase2_clips_removal_episode_blacklist.sql` | ✓ VERIFIED | removal columns + blacklist table + RLS |
| `packages/db/migrations/0006_phase2_aion10_fixture_candidates.sql` | ✓ VERIFIED | Staging table + RLS |
| shadcn primitives (dialog/tabs/select/textarea/checkbox/tooltip/badge/dropdown-menu/form/sonner) | ✓ VERIFIED | All 10 present in `apps/web/components/ui/` |

### Plan 02 — Transcript Providers

| Artifact | Status | Evidence |
|----------|--------|----------|
| `packages/core/src/transcripts/types.ts` | ✓ VERIFIED | TranscriptProvider interface, TranscriptResult, WordTimestamped types |
| `packages/core/src/transcripts/orchestrator.ts` | ✓ VERIFIED | 44 lines; `fetchTranscript()` exported; curator-facing error for missing captions |
| `packages/core/src/transcripts/youtube.ts` | ✓ VERIFIED | Real youtube-transcript-plus integration; bug fix for seconds vs ms |
| `packages/core/src/transcripts/deepgram.ts` | ✓ VERIFIED | @deepgram/sdk v5 API; test seam `__setDeepgramFetchImpl` |
| `packages/core/src/transcripts/manual.ts` | ✓ VERIFIED | VTT/SRT/txt parsing via subtitle@4 |
| `packages/core/src/transcripts/index.ts` | ✓ VERIFIED | Re-exports fetchTranscript + all provider types |
| `packages/core/src/index.ts` | ✓ VERIFIED | `export * from './transcripts'` present |

### Plan 03 — Ingestion Pipeline

| Artifact | Status | Evidence |
|----------|--------|----------|
| `apps/web/lib/curate/chunking.ts` | ✓ VERIFIED | 512/64-token sliding window, word-boundary timestamps |
| `packages/core/src/embeddings/embedClip.ts` | ✓ VERIFIED | 1536-dim vector via text-embedding-3-small; AION-09 wrapper respected |
| `packages/core/src/embeddings/embedTranscriptChunks.ts` | ✓ VERIFIED | Batched at BATCH_SIZE=100; dimensionality validation |
| `apps/web/app/actions/curate/addPodcast.ts` | ✓ VERIFIED | ADMN-16 inline podcast add; curator-gated; real INSERT |
| `apps/web/app/api/admin/ingest/route.ts` | ✓ VERIFIED | 176 lines; full pipeline (URL or VTT/SRT → transcript → chunks → embeddings → persistence); XOR schema validation |

### Plan 04 — Clip Editor + AI Co-pilot

| Artifact | Status | Evidence |
|----------|--------|----------|
| `apps/web/lib/curate/hardBlockKeywords.ts` | ✓ VERIFIED | 62 lines; 30 prescription names + DOSING_RE + CONDITION_TREATMENT_RE |
| `apps/web/app/actions/curate/approveClip.ts` | ✓ VERIFIED | 130 lines; transaction + hard-block + embed-on-approve (tolerant) + audit |
| `packages/core/src/llm/copilot/schemas.ts` | ✓ VERIFIED | copilotSchemaByKind; three operation schemas |
| `packages/core/src/llm/grounding/similarityCheck.ts` | ✓ VERIFIED | GROUNDING_THRESHOLD=0.85; groundingCheck() caller-injected pattern |
| `apps/web/app/api/admin/copilot/stream/route.ts` | ✓ VERIFIED | streamObject; onFinish groundingCheck; ai_suggested audit row |
| `apps/web/app/actions/curate/copilot.ts` | ✓ VERIFIED | acceptCopilotSuggestion / rejectCopilotSuggestion; ai_accepted/ai_rejected audit rows |
| `apps/web/app/(admin)/curate/editor/[clipId]/page.tsx` | ✓ VERIFIED | Server component shell loading clip+episode+transcript |
| `apps/web/app/(admin)/curate/_components/editor/ThreePanePanels.tsx` | ✓ VERIFIED | Imports and renders TranscriptPane, PlayerPane, MetadataTab, CopilotTab |
| `apps/web/app/(admin)/curate/_components/editor/TranscriptPane.tsx` | ✓ VERIFIED | useVirtualizer; selectionStartIndex/selectionEndIndex; keyboard shortcuts |
| `apps/web/app/(admin)/curate/_components/editor/PlayerPane.tsx` | ✓ VERIFIED | YouTubeEmbed with key-remount seek |
| `apps/web/app/(admin)/curate/_components/editor/MetadataTab.tsx` | ✓ VERIFIED | react-hook-form + zodResolver + ADMN-15 length hint |
| `apps/web/app/(admin)/curate/_components/editor/CopilotTab.tsx` | ✓ VERIFIED | 244 lines; fetch to copilot stream; ReadableStream reader; suggestion cards |
| `apps/web/app/(admin)/curate/_components/copilot/SuggestionCard.tsx` | ✓ VERIFIED | Renders diff view + accept/reject buttons |
| `apps/web/app/(admin)/curate/_components/copilot/DiffView.tsx` | ✓ VERIFIED | diffWords/diffLines rendering |
| `apps/web/app/(admin)/curate/_components/copilot/AION10Badge.tsx` | ✓ VERIFIED | Guard pattern (return null when similarity >= threshold); shows warning badge below threshold |

### Plan 05 — Curator Board + Cron

| Artifact | Status | Evidence |
|----------|--------|----------|
| `apps/web/app/actions/curate/removeClip.ts` | ✓ VERIFIED | Soft-delete + habitTemplateClips cascade + clip_edits audit |
| `apps/web/app/actions/curate/removeEpisodeAndBlacklist.ts` | ✓ VERIFIED | Blacklist upsert (onConflictDoNothing) + episode mark + cascade clips |
| `apps/web/app/actions/curate/advanceClipStatus.ts` | ✓ VERIFIED | Audit trail for column transitions |
| `apps/web/app/actions/curate/boardQueries.ts` | ✓ VERIFIED | getBoardColumn() with 4-column SQL + coverage_gap sort |
| `apps/web/app/(admin)/curate/page.tsx` | ✓ VERIFIED | Loads all 4 board columns in parallel via getBoardColumn(); wired to KanbanBoard |
| `apps/web/app/(admin)/curate/_components/board/KanbanBoard.tsx` | ✓ VERIFIED | DndContext; 4-column drag; published column blocked; `return null` is a findClipColumn guard (not a stub) |
| `apps/web/app/(admin)/curate/_components/board/Column.tsx` | ✓ VERIFIED | Empty states with locked UI-SPEC copy + count badges |
| `apps/web/app/(admin)/curate/_components/board/ClipCard.tsx` | ✓ VERIFIED | claim/domain/duration/relative-time via Intl.RelativeTimeFormat |
| `apps/web/app/(admin)/curate/_components/removal/RemovalDialog.tsx` | ✓ VERIFIED | reason/notes/DMCA URL; calls removeClip; a11y htmlFor fixed |
| `apps/web/app/(admin)/curate/_components/shared/AddPodcastInlineCombobox.tsx` | ✓ VERIFIED | Inline podcast create flow calling addPodcast action |
| `apps/web/app/(admin)/curate/_components/shared/KeyboardCheatsheet.tsx` | ✓ VERIFIED | Global ? shortcut panel |
| `apps/web/app/(admin)/curate/ingest/page.tsx` | ✓ VERIFIED | Ingestion surface shell |
| `apps/web/app/(admin)/curate/_components/ingest/IngestionForm.tsx` | ✓ VERIFIED | 4-step progress; manual VTT/SRT fallback; `return null` guards are step-state guards |
| `apps/web/app/api/cron/oembed-check/route.ts` | ✓ VERIFIED | Bearer auth; THRESHOLD=3 flap suppression; removed_from_source flagging; real DB queries |
| `packages/db/migrations/0007_phase2_oembed_cron.sql` | ✓ VERIFIED | pg_cron schedule at 04:00 UTC + Vercel fallback docs |

### Plan 06 — Gating + Legal

| Artifact | Status | Evidence |
|----------|--------|----------|
| `tests/eval/aion-10/runner.ts` | ✓ VERIFIED | GROUNDED_THRESHOLD=0.9; HALLUCINATED_TOLERANCE=0.0; parseFixtures/runEval/assertThresholds exported; describe.runIf gate |
| `tests/eval/aion-10/fixtures.jsonl` | ✗ STUB | 5 rows, all reviewer="seed-stub". Requires 20 hand-graded rows per REQUIREMENTS AION-10 and ROADMAP SC6. |
| `.github/workflows/aion10-eval.yml` | ✓ VERIFIED | Triggers on llm/** + prompts/**; AION10_LIVE_EVAL=1 set |
| `apps/web/components/disclaimer/HealthDisclaimer.tsx` | ✓ VERIFIED | variant=card/page/footer; data-variant attribute; uses color tokens |
| `apps/web/app/legal/dmca/page.tsx` | ✓ VERIFIED | H1 + 48h SLA + required-info list + 17 USC §512(g) + HealthDisclaimer variant="page" |
| `MEDICAL_REVIEW.md` | ✓ VERIFIED | §Clip Length Editorial Guidance (LGL-08) present; sponsor-read offset rule; qualifier-must-be-in-window rule; hard exclusions |
| `.planning/phases/02-curation-tooling-doac-corpus/CURATION_TRACKER.md` | ✓ VERIFIED | Per-domain progress table; SQL refresh query; AION-10 fixture promotion log |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `POST /api/admin/ingest` | `fetchTranscript()` | `@cited/core` import | ✓ WIRED | Direct import and call in route.ts |
| `POST /api/admin/ingest` | `transcript_chunks` table | `embedTranscriptChunks()` + Drizzle insert | ✓ WIRED | delete-then-reinsert idempotent pattern verified |
| `approveClip()` | `clips.embedding` | `embedClip()` → `db().update(clips).set({embedding})` | ✓ WIRED | Tolerant pattern: embed failure inserts audit row, does not roll back approval |
| `approveClip()` | `hardBlockKeywords` | `matchesHardBlock()` call before transaction | ✓ WIRED | Blocks prescription/dosing/condition-treatment content |
| `streamObject` copilot route | `groundingCheck()` | `onFinish` callback | ✓ WIRED | GROUNDING_THRESHOLD=0.85; caller-injected NearestChunkQuery |
| `KanbanBoard` | `advanceClipStatus()` | `handleDragEnd` → server action call | ✓ WIRED | dnd-kit drag event triggers audit-logged status advance |
| `curate/page.tsx` | `getBoardColumn()` | parallel Promise.all of 4 columns | ✓ WIRED | All 4 columns: inbox/drafting/review/published loaded in parallel |
| `removeEpisodeAndBlacklist()` | `episode_blacklist` + cascade | `onConflictDoNothing` upsert + cascadeClips | ✓ WIRED | LGL-03 workflow complete |
| `oembed-check` cron | `episodes.oembed404Count` + `removed_from_source` | THRESHOLD=3 + Drizzle update | ✓ WIRED | ADMN-08 flap suppression wired |
| `HealthDisclaimer` | `/legal/dmca` page | Direct import + `<HealthDisclaimer variant="page" />` | ✓ WIRED | Only wired surface in Phase 2 |
| `HealthDisclaimer` | habit cards / onboarding shell | Phase 3 deferred | ✗ NOT WIRED | SC5 partially unmet; onboarding flow has disclaimer_ack checkbox (AUTH-04) but not the HealthDisclaimer component |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `IngestionForm.tsx` | `state`, `steps` | `fetch('/api/admin/ingest', ...)` | Yes — route handler persists transcript + chunks + embeddings to Postgres | ✓ FLOWING |
| `curate/page.tsx` | `inbox/drafting/review/published` | `getBoardColumn()` → raw SQL via Drizzle | Yes — Postgres query with coverage_gap subquery | ✓ FLOWING |
| `editor/[clipId]/page.tsx` | `clip`, `episode`, `transcript` | Drizzle `db().select()` from clips/episodes/transcripts | Yes — server component direct DB read | ✓ FLOWING |
| `TranscriptPane.tsx` | `words: TranscriptWord[]` | Prop from page.tsx → parsed transcript.words | Yes — JSONB words from transcripts table | ✓ FLOWING |
| `CopilotTab.tsx` | `suggestions` | `fetch('/api/admin/copilot/stream', ...)` → ReadableStream | Yes — Vercel AI SDK streamObject with real LLM | ✓ FLOWING |
| `oembed-check/route.ts` | `episodes[]` | `db().select().from(episodes).where(ne(...,'removed_from_source'))` | Yes — real DB query | ✓ FLOWING |
| `ClipCard` hasAiHistory | hardcoded `false` in page.tsx | None — Phase 5 stub | No — hardcoded | ⚠️ HOLLOW_PROP |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `fetchTranscript` exported from `@cited/core` | `grep "export \* from './transcripts'" packages/core/src/index.ts` | Match found | ✓ PASS |
| `hardBlockKeywords` catches prescription names | Source review: PRESCRIPTION_NAMES array has 30 entries; DOSING_RE; CONDITION_TREATMENT_RE | Comprehensive list, real regex patterns | ✓ PASS |
| `ingest route` writes to transcript_chunks | `grep "transcriptChunks" apps/web/app/api/admin/ingest/route.ts` | delete + insert pattern | ✓ PASS |
| `approveClip` writes to clips.embedding | `grep "embedding.*vector\|set.*embedding" approveClip.ts` | `db().update(clips).set({ embedding: vector })` | ✓ PASS |
| AION-10 CI workflow has correct trigger paths | `grep "llm/\*\*\|prompts" aion10-eval.yml` | Both paths present | ✓ PASS |
| `fixtures.jsonl` has 20 hand-graded rows | `wc -l fixtures.jsonl` | 5 rows (seed-stubs) | ✗ FAIL |
| CURATION_TRACKER shows ≥30 approved clips | File review | 0 approved across all domains | ✗ FAIL |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| ADMN-03 | Admin UI: create/edit/approve/reject clips with all fields | ✓ SATISFIED | Three-pane editor + MetadataTab + approveClip action; all required fields in approveClipBaseSchema |
| ADMN-04 | Approve triggers OpenAI text-embedding-3-small write | ✓ SATISFIED | `approveClip.ts`: `embedClip()` called post-commit; `clips.embedding` updated |
| ADMN-05 | Risk flags mandatory on approval; risk-flag banner | ✓ SATISFIED | `approveClipSchema` requires riskFlags; banner copy in MetadataTab |
| ADMN-06 | Hard-block: prescription drugs / dosing / diagnosed conditions | ✓ SATISFIED | `hardBlockKeywords.ts` (30 drug names + DOSING_RE + CONDITION_TREATMENT_RE); `matchesHardBlock()` called in approveClip |
| ADMN-07 | Admin can mark episode removed_from_source; cascade | ✓ SATISFIED | `removeEpisodeAndBlacklist()` with blacklist + availability cascade; RemovalDialog in ClipCard |
| ADMN-08 | Daily pg_cron oEmbed check; flags unavailable clips | ✓ SATISFIED | `oembed-check/route.ts` with THRESHOLD=3; migration 0007 with pg_cron schedule |
| ADMN-09 | ≥30 approved clips across 4 domains before alpha launch | ✗ BLOCKED | CURATION_TRACKER: 0 clips approved in all domains. Tooling complete; editorial work not done. |
| ADMN-10 | AI co-pilot in clip editor (timestamps + claim + alternatives) | ✓ SATISFIED | CopilotTab with 3 presets + free-text; streamObject endpoint; accept/reject actions |
| ADMN-11 | Audit log: AI suggestion + accept/reject per clip | ✓ SATISFIED | clip_edits with action=ai_suggested/ai_accepted/ai_rejected; payload JSONB |
| ADMN-12 | Ingest: YouTube URL or transcript document | ✓ SATISFIED | `POST /api/admin/ingest` with XOR validation; IngestionForm with manual fallback panel |
| ADMN-13 | Ingested transcripts indexed into RAG corpus (chunked + embedded) | ✓ SATISFIED | chunkTranscript (512/64 window) + embedTranscriptChunks (batched 100) → transcript_chunks inserts |
| ADMN-14 | Manual clip cutter: transcript scrub + start/end selection | ✓ SATISFIED | TranscriptPane with useVirtualizer + selectionStartIndex/endIndex + keyboard shortcuts |
| ADMN-15 | Clip length not capped; editorial hint inline in editor | ✓ SATISFIED | MetadataTab renders length-hint non-blocking message |
| ADMN-16 | Inline podcast add when source not in podcasts table | ✓ SATISFIED | `addPodcast()` server action; AddPodcastInlineCombobox wired in IngestionForm |
| LGL-01 | Health disclaimer on every habit card, public habit page, onboarding flow | ? PARTIAL | HealthDisclaimer component exists (card/page/footer variants); wired to /legal/dmca. NOT wired to onboarding flow shell. Habit cards are Phase 3 (expected). |
| LGL-02 | DMCA takedown contact + 48-hour SLA at /legal/dmca | ✓ SATISFIED | `/legal/dmca` page with H1 + 48h SLA + required-info list + counter-notice reference |
| LGL-03 | One-click admin remove episode + clips + blacklist | ✓ SATISFIED | `removeEpisodeAndBlacklist()` + `removeClip()` with habitTemplateClips cascade; RemovalDialog |
| LGL-08 | Editorial policy: clip-length guidance in MEDICAL_REVIEW.md | ✓ SATISFIED | §Clip Length Editorial Guidance section present; sponsor-read offset + qualifier-in-window + hard exclusions |
| AION-10 | 20-transcript hand-graded hallucination eval set; CI gate | ? PARTIAL | CI gate (aion10-eval.yml), runner (parseFixtures/runEval/assertThresholds), judge-prompt all exist and are substantive. Only 5 seed-stub fixtures exist vs. 20 required by REQUIREMENTS.md + SC6. |

**Orphaned requirements check:** ROADMAP Phase 2 lists 19 requirements. All 19 verified above (ADMN-03 through ADMN-16, LGL-01 through LGL-03, LGL-08, AION-10). No orphaned requirements.

**Note on ADMN-10:** Not listed in the Phase 2 plan frontmatter IDs in the task prompt, but is listed in ROADMAP Phase 2 requirements. Verified satisfied above.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/app/(admin)/curate/_components/board/ClipCard.tsx` | page.tsx call site | `hasAiHistory={false}` — hardcoded prop | ℹ️ Info | Phase 5 wires AI history lookup from clip_edits; documented in Plan 05 SUMMARY as known stub |
| `apps/web/app/(admin)/curate/_components/editor/CopilotTab.tsx` | ~90-95 | Reads full stream before updating suggestion card | ⚠️ Warning | Partial-object streaming is deferred; full stream is collected then parsed. Functional but not streaming UX. Acknowledged in Plan 04 SUMMARY. |
| `apps/web/app/legal/dmca/page.tsx` | 20 | `dmca@<chosen-domain>` placeholder email | ℹ️ Info | Domain not yet chosen (NAME-02/03 in Phase 4). SLA and legal content are locked; only domain changes. |
| `tests/eval/aion-10/fixtures.jsonl` | All 5 rows | `"reviewer": "seed-stub"` — synthetic placeholders | 🛑 Blocker | REQUIREMENTS.md + ROADMAP SC6 require 20 hand-graded transcripts. This is a substantive gap, not just cosmetic. |

---

## Human Verification Required

### 1. ≥30 Approved Clips — Content Verification

**Test:** Log in as curator, verify the Kanban board shows clips in all 4 domains (sleep / nutrition_gut / exercise_longevity / mental_health) with `status='approved'` and `embedding IS NOT NULL`.
**Expected:** ≥7 approved clips per domain (≥30 total); all have embeddings; none touch prescription drugs/dosing/condition treatment.
**Why human:** Requires actual editorial curation sessions using the built tooling. Cannot be verified programmatically from the codebase alone.

### 2. Three-Pane Editor — End-to-End Curator Flow

**Test:** (a) Ingest a YouTube URL, (b) scrub the transcript to select start/end, (c) invoke AI co-pilot with "refine claim" preset, (d) accept the suggestion, (e) fill metadata including risk flags, (f) click Approve.
**Expected:** Clip moves to `approved` status; `clips.embedding` is populated; `clip_edits` contains ai_suggested → ai_accepted → approved audit rows.
**Why human:** Requires a live Supabase instance + ANTHROPIC_API_KEY + YouTube URL with captions; full streaming UX cannot be tested programmatically.

### 3. Kanban Drag-to-Advance — UX Verification

**Test:** Drag a clip card from Inbox to Drafting, then Drafting to Review. Attempt to drag any card to Published column.
**Expected:** Column moves succeed for Inbox→Drafting and Drafting→Review; Published column is blocked with locked icon/toast.
**Why human:** @dnd-kit drag interactions require browser; jsdom testing covers the handleDragEnd logic but not pointer/touch input.

### 4. oEmbed Cron — Live Trigger

**Test:** POST to `/api/cron/oembed-check` with `Authorization: Bearer <CRON_SECRET>`.
**Expected:** Returns 200 with `{checked: N, flagged: M}` where N is count of non-removed episodes queried.
**Why human:** Requires live database with episode rows and valid CRON_SECRET env var.

---

## Gaps Summary

**3 gaps identified, 2 blocking:**

**Gap 1 — ADMN-09/SC3: Zero approved clips (tooling vs. corpus).** The entire curation tooling layer (ingestion, transcript providers, chunking+embedding pipeline, three-pane editor, AI co-pilot, approveClip action, Kanban board) is complete, verified, and wired. But the editorial work of actually curating ≥30 DOAC clips has not been done. CURATION_TRACKER shows 0 clips across all domains. This is the phase's stated binding constraint ("The corpus is the binding constraint; this phase exists to dissolve it") and it has not been dissolved. SC3 and ADMN-09 require the actual corpus content.

**Gap 2 — AION-10/SC6: 5 seed-stub fixtures vs. 20 hand-graded.** REQUIREMENTS.md AION-10 and ROADMAP SC6 both state "20-transcript hand-graded hallucination eval set." Plan 06 shipped 5 synthetic seed rows and defers expansion to Phase 5. The CI scaffolding is solid, but the eval set is incomplete. The runner will pass with 5 fixtures (3 grounded, 2 hallucinated per seeds), but CI with 5 synthetic fixtures provides weaker hallucination assurance than 20 hand-graded ones.

**Gap 3 — LGL-01/SC5: HealthDisclaimer not wired to onboarding flow shell.** SC5 says "Health disclaimer renders on every habit card and onboarding flow shell." Habit-card wiring is correctly deferred to Phase 3. But the onboarding flow shell (`(onboarding)/onboarding/legal-gate/`) does not render `<HealthDisclaimer />` — it has only the AUTH-04 `disclaimer_ack` checkbox. The `HealthDisclaimer` component was built but only wired to `/legal/dmca`. Adding `<HealthDisclaimer variant="footer" />` to the onboarding layout is a minor addition.

Gaps 1 and 2 are the more significant blockers: Gap 1 is editorial (must be done by the curator, not engineering), and Gap 2 requires 15 additional hand-graded fixture rows. Gap 3 is a minor engineering addition.

---

*Verified: 2026-05-12T01:00:00Z*
*Verifier: Claude (gsd-verifier)*
