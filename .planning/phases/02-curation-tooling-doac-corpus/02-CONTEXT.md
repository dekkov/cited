# Phase 02 — Curation Tooling + DOAC Corpus

## Goal
Build the admin curation tooling that lets a single curator (the maintainer) produce, review, and publish the v1 DOAC clip corpus (≥30 clips across the 4 locked domains). Output of Phase 2 is: working curator UI + ≥30 published clips with embeddings + AI co-pilot wired through the AION-09 LLM wrapper + AION-10 hallucination eval gate in CI.

## Scope (Phase 2 IN)
- Clip editor UI (admin-only, behind RLS role gate from Phase 1).
- Transcript ingestion pipeline (YouTube auto-captions → deepgram fallback).
- AI co-pilot for start/end suggestions, claim refinement, alternative phrasing.
- Clip status workflow (Inbox → Drafting → Review → Published) with board view.
- Embed-on-approve: publishing a clip triggers OpenAI `text-embedding-3-small` and writes to pgvector (HNSW index from Phase 1).
- Admin removal workflow (soft-delete with reason + cascade to habits).
- AION-10 eval gate: production substring/similarity check + CI LLM-as-judge on golden fixtures.
- Seed ≥30 clips across sleep / stress / nutrition / movement domains.

## Out of Scope (Phase 2 OUT — deferred)
- **Public-facing clip pages** — Phase 3/4. No `/h/[slug]` rendering yet.
- **Public DMCA submission form (LGL-02/LGL-03)** — deferred to whichever phase ships public clip pages. Admin removal button + `mailto:dmca@cited.dev` footer link is enough while surface is admin-only.
- **Tombstone replacement auto-flow** — Phase 5, after extraction worker produces enough candidates to auto-swap.
- **Python extraction worker (transcribe → diarize → claim-extract)** — Phase 5. Phase 2 writes to the same `transcripts` table the worker will later populate; no migration burden.
- **Multi-curator queue / assignment** — single curator at MVP per PROJECT.md.

## Locked Decisions (from /gsd:discuss-phase)

### GA1 — Clip Editor Layout + AI Co-pilot
- **Layout A (three-pane workspace).** Left: scrollable transcript with timestamp anchors + selection highlight. Top-right: sticky YouTube iframe (~360px). Bottom-right: tabbed panel switching between **metadata form** and **AI co-pilot**.
- **Co-pilot model X (hybrid).** Three preset buttons — `Suggest start/end`, `Refine claim`, `Propose alternative phrasing` — plus free-text input for ad-hoc questions. Suggestions render as side-by-side diffs with one-click Accept / Reject.
- **All AI suggestions, accepts, and rejects are logged to `clip_edits`** (ADMN-11).

### GA2 — Manual Scrub-and-Cut (ADMN-14)
- **Transcript-anchored selection.** Click first word + shift-click last word → start/end snap to word timestamps. Player auto-seeks on selection. Two number inputs allow ±0.1s nudging. Keyboard: `[` set start, `]` set end, `space` play/pause, `←/→` nudge ±0.5s.
- **Word-level timestamp source = A3:** YouTube auto-captions first (via `youtube-transcript` or `youtubei.js`), deepgram fallback when captions missing or English-confidence below threshold.

### GA3 — Transcript Ingestion (ADMN-12)
- **Path D:** Curator pastes YouTube URL → server route fetches auto-captions → if missing/low-confidence, queues deepgram job (~$0.005/episode, ~2min wait) with "Transcribing — ~2 min" UI state.
- Stored once per `youtube_video_id` in `transcripts` table; many clips can reference the same transcript.
- **Phase 5 worker writes to the same table** — curator UI keeps working unchanged.

### GA4 — Transcript Storage
- **Postgres JSONB (A).** `transcripts` columns: `(video_id PK, source, segments JSONB, raw_text TEXT, fetched_at, language, tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', raw_text)) STORED)`.
- GIN index on `tsv` from day 1 (**A1**) — enables corpus-wide curator search ("find clips mentioning glucose").
- R2 deferred to v0.5 per PROJECT.md; one-shot migration when extraction pipeline lands and storage actually fragments.

### GA5 — AION-10 Hallucination Eval
- **Strategy D (hybrid).**
  - **Production runtime:** cheap substring + cosine-similarity check (≥0.85 against transcript-span sentences) on every co-pilot suggestion. Below threshold → "⚠ may be unsupported" badge surfaced to curator. Suggestion still shown; curator still owns the accept/reject.
  - **CI gate:** LLM-as-judge using **Claude Sonnet 4.x** against `tests/eval/aion-10/fixtures.jsonl`. Thresholds: **≥90% grounded, 0% hallucinated.** Failure fails the build.
- **Fixture seeding:** during Phase 2, accepted clips create candidate fixture rows in a dev-only table. Phase 2 ends with ~20 of those promoted into `fixtures.jsonl`.
- Gate triggers on any PR touching `packages/core/llm/` or files matching `**/prompts/**`.

### GA6 — DMCA + Admin Removal — DEFERRED
- Public clip pages don't ship in Phase 2, so DMCA exposure is zero.
- Phase 2 still ships the **admin removal button** (soft-delete with reason enum + cascade to habits) because removing bad clips is an internal-curator need regardless of public surface.
- **Re-pickup:** LGL-02 / LGL-03 (public-facing DMCA form + 48h SLA workflow) lock when the phase that ships public clip pages is planned.
- **Phase 2 removal mechanism (locked):** soft-delete + reason (`dmca` / `factual-error` / `medical-risk` / `speaker-request` / `other`) + free-text notes + optional takedown ref URL. Sets `clips.removed_at`, `clips.removal_reason`, `clips.removal_notes`. Audit row in `clip_edits` with action `removed`.
- **Cascade S2:** removing a clip auto-NULLs `habits.evidence_clip_id` and queues a "needs new evidence" admin task. (No dangling clip-unavailable placeholders for users.)
- Removed clips stay in DB indefinitely for audit. Hard-delete only on GDPR / right-of-publicity request.

### GA7 — Curator Workflow / Queue
- **Board view A.** Four columns: `Inbox` (URLs queued, no clip row yet) → `Drafting` (row exists, required fields incomplete) → `Review` (complete, pending self-review) → `Published` (`published_at` set, embedded). Drag-to-advance. Column-header counts.
- **Priority P3 (hybrid):** auto-sort default = `(episode_published_at DESC, domain_coverage_gap DESC)` so newer episodes + under-served domains float up. Manual override pins items to top.
- **"Next" shortcut:** `g n` (or button) jumps straight into the clip editor for the top item in `Drafting`, falling back to top of `Inbox`. One-click resume after a break.

## Requirement Coverage
Phase 2 IDs locked in this CONTEXT:
- **ADMN-03 … ADMN-16** — curation tooling stack (editor, transcript, AI co-pilot, status workflow, clip_edits audit, board view, removal).
- **AION-09** — LLM wrapper at `packages/core/llm/` enforced via Biome noRestrictedImports (already in Phase 1).
- **AION-10** — hallucination eval gate (Strategy D above).
- **LGL-01** — copyright posture (deep-link only, no audio/video storage) is structural and inherited from Phase 1; Phase 2 enforces it in the editor (no upload affordances).
- **LGL-02 / LGL-03** — public DMCA flow deferred (see GA6).
- **LGL-08** — medical-risk hard-block on prescription/dosing surfaces in clip editor (claim field validation + risk_flags enum).

## Open Items for /gsd:ui-phase
- Concrete shadcn/ui component picks for the three-pane layout (resizable panels — `react-resizable-panels` is the de-facto pick).
- AI suggestion diff component (probably a custom inline diff, not a library).
- Board view component (`@dnd-kit/core` for drag-and-drop columns).
- Word-level transcript renderer (perf concern: 3hr episode = ~20K words; virtualize with `@tanstack/react-virtual`).
- Empty-state visuals for each board column.
- Removal modal copy + confirm-twice ergonomics.

## Open Items for /gsd:plan-phase
- Exact `transcripts` schema migration (segments JSONB shape; tsvector generated column).
- `clip_edits` audit row shape for AI-suggestion actions (`action ∈ {ai_suggested, ai_accepted, ai_rejected, removed, ...}`, `payload JSONB`).
- Deepgram client wrapper in `packages/core/transcripts/` behind a `TranscriptProvider` interface so YouTube + deepgram are swappable.
- AION-10 fixture file format + judge prompt + CI workflow.
- HNSW embed-on-approve hook path (Drizzle insert → call OpenAI → update `clips.embedding`).
- Domain-coverage-gap query for board auto-sort.
- Removal cascade trigger (Postgres trigger vs application-layer in server action — likely application-layer for testability).

## Constraints Inherited
- Solo, ~25hr/wk. Phase 2 must stay under ~80hr of plans (≈3 weeks elapsed).
- Free-tier-feasible. Deepgram costs are small (~$0.005/episode × 30 = $0.15) and acceptable for the seed corpus.
- No audio/video storage. Deep-link only.
- Cited working name through Phase 4.
