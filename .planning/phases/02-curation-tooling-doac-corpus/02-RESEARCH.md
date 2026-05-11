# Phase 2: Curation Tooling + DOAC Corpus — Research

**Researched:** 2026-05-10
**Domain:** Internal admin curation tooling — YouTube ingestion + transcript RAG indexing + AI-co-piloted clip editor + status workflow + AION-10 hallucination eval gate
**Confidence:** HIGH on stack and patterns (locked by Phase 1 + UI-SPEC + CONTEXT). MEDIUM-HIGH on specific library picks (transcript fetch + Deepgram client wrappers). MEDIUM on AION-10 fixture format (novel to this project).

## Summary

Phase 2 is a self-contained admin app behind an RLS-gated `(admin)/curate/*` route group inherited from Phase 1. There is essentially **no greenfield architecture choice left** — CONTEXT.md locked GA1–GA7, UI-SPEC.md locked layout/typography/copy, CLAUDE.md locks the stack. The planner's job is to decompose into Drizzle migrations, server actions, route handlers, and React surfaces that obey the locked decisions and produce ≥30 approved clips with embeddings.

The two areas with research-shaped uncertainty are (1) **the YouTube caption + Deepgram fallback abstraction** (`packages/core/transcripts/TranscriptProvider`) and (2) **the AION-10 fixture file format + judge prompt + CI workflow** — both of which need concrete shapes the planner can encode as tasks.

**Primary recommendation:** Decompose Phase 2 into 6 plans: (1) `transcripts` + `clip_edits` + removal schema + RLS extensions, (2) `packages/core/transcripts` TranscriptProvider abstraction (youtube-transcript-plus + Deepgram), (3) ingestion route + transcript chunking + embedding pipeline (re-use Phase 1 LLM wrapper), (4) clip editor three-pane workspace + AI co-pilot + audit-log, (5) board view + ingestion form + removal modal + cascade workflow + pg_cron oEmbed check, (6) AION-10 eval scaffolding (CI workflow + judge prompt + fixture promotion) + legal artifacts (`/legal/dmca`, `MEDICAL_REVIEW.md` LGL-08 update, disclaimer component) + curation work to seed ≥30 clips.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**GA1 — Clip Editor Layout + AI Co-pilot**
- Layout A (three-pane workspace). Left: scrollable transcript with timestamp anchors + selection highlight. Top-right: sticky YouTube iframe (~360px). Bottom-right: tabbed panel switching between **metadata form** and **AI co-pilot**.
- Co-pilot model X (hybrid). Three preset buttons — `Suggest start/end`, `Refine claim`, `Propose alternative phrasing` — plus free-text input. Suggestions render as side-by-side diffs with one-click Accept / Reject.
- All AI suggestions, accepts, and rejects are logged to `clip_edits` (ADMN-11).

**GA2 — Manual Scrub-and-Cut (ADMN-14)**
- Transcript-anchored selection. Click first word + shift-click last word → start/end snap to word timestamps. Player auto-seeks on selection. Two number inputs allow ±0.1s nudging. Keyboard: `[` set start, `]` set end, `space` play/pause, `←/→` nudge ±0.5s.
- Word-level timestamp source = A3: YouTube auto-captions first (via `youtube-transcript-plus` or `youtubei.js`), Deepgram fallback when captions missing or English-confidence below threshold.

**GA3 — Transcript Ingestion (ADMN-12)**
- Path D: Curator pastes YouTube URL → server route fetches auto-captions → if missing/low-confidence, queues Deepgram job (~$0.005/episode, ~2min wait) with "Transcribing — ~2 min" UI state.
- Stored once per `youtube_video_id` in `transcripts` table; many clips can reference the same transcript.
- Phase 5 worker writes to the same table.

**GA4 — Transcript Storage**
- Postgres JSONB (A). `transcripts(video_id PK, source, segments JSONB, raw_text TEXT, fetched_at, language, tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', raw_text)) STORED)`.
- GIN index on `tsv` from day 1 (A1).
- R2 deferred to v0.5.

**GA5 — AION-10 Hallucination Eval**
- Strategy D (hybrid). Production: substring + cosine-similarity ≥0.85 against transcript-span sentences per co-pilot suggestion. Below threshold → "⚠ may be unsupported" badge. CI: LLM-as-judge using Claude Sonnet 4.x against `tests/eval/aion-10/fixtures.jsonl`. Thresholds: ≥90% grounded, 0% hallucinated. Failure fails build.
- Fixture seeding: dev-only candidate table during Phase 2; ~20 promoted to `fixtures.jsonl` by phase end.
- Gate triggers on PRs touching `packages/core/llm/` or `**/prompts/**`.

**GA6 — DMCA + Admin Removal**
- Public DMCA form deferred until public clip pages ship (Phase 3/4).
- Phase 2 ships admin removal button: soft-delete + reason enum (`dmca` / `factual-error` / `medical-risk` / `speaker-request` / `other`) + free-text notes + optional takedown ref URL. Sets `clips.removed_at`, `clips.removal_reason`, `clips.removal_notes`. Audit row in `clip_edits` with action `removed`.
- Cascade S2: removing a clip auto-NULLs `habits.evidence_clip_id` and queues a "needs new evidence" admin task.
- Removed clips stay in DB indefinitely for audit.

**GA7 — Curator Workflow / Queue**
- Board view A. Four columns: Inbox → Drafting → Review → Published. Drag-to-advance via `@dnd-kit/core`. Column-header counts.
- Priority P3 (hybrid): auto-sort `(episode_published_at DESC, domain_coverage_gap DESC)`. Manual pin overrides.
- `g n` shortcut jumps into top-of-Drafting clip editor.

### Claude's Discretion
*(All planning gray areas locked in CONTEXT.md; remaining open items are implementation-shape choices listed in CONTEXT "Open Items for /gsd:plan-phase" — these are normal planner decisions, not relitigation of locked GA1–GA7.)*

- Exact `transcripts` segment JSONB shape (words vs sentences vs hybrid).
- `clip_edits.payload` JSONB shape per `action` enum value.
- `TranscriptProvider` interface signature shape.
- AION-10 fixture row format and judge prompt body.
- HNSW embed-on-approve hook path (server action vs Drizzle trigger — recommend server action for testability).
- Domain-coverage-gap SQL for board auto-sort.
- Removal cascade trigger (DB trigger vs server-action transaction — recommend server-action for testability).

### Deferred Ideas (OUT OF SCOPE)
- Public-facing clip pages `/h/[slug]` — Phase 3/4.
- Public DMCA submission form (LGL-02/LGL-03 public flow) — re-pickup when public surfaces ship.
- Tombstone replacement auto-flow — Phase 5.
- Python extraction worker (transcribe → diarize → claim-extract) — Phase 5.
- Multi-curator queue / assignment — single curator at MVP.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMN-03 | Admin UI for clip CRUD with all fields (claim, rationale, speaker, speaker_status, domain, start/end, evidence_strength, risk_flags, youtube_video_id, episode_id) | UI-SPEC §"Clip editor (three-pane workspace)" §"Metadata" tab — `react-hook-form` + zod; Phase 1 schema already has these columns on `clips` |
| ADMN-04 | Approving a clip triggers OpenAI `text-embedding-3-small` write to `clips.embedding` | "Embed-on-approve" section below — server action calls `packages/core/llm` provider, writes 1536-dim vector to HNSW-indexed column from Phase 1 |
| ADMN-05 | Mandatory risk_flags on approval; banner for medical/supplement/contraindication | Zod refinement on approval input + Drizzle `NOT NULL` enforcement; banner component is Phase 3's habit-card concern but disclaimer-on-card scaffolding (LGL-01) ships here |
| ADMN-06 | Hard-block prescription/dosing/diagnosed-condition clips | Server-action validation with keyword denylist + zod `.refine()`; surfaces as toast in `--color-warn` per UI-SPEC error-state row |
| ADMN-07 | One-click `removed_from_source` episode cascade-flags linked clips | Server action runs in transaction: `UPDATE episodes SET removed_from_source_at = now() WHERE id = ?; UPDATE clips SET source_unavailable_at = now() WHERE episode_id = ?` |
| ADMN-08 | Daily pg_cron job pings YouTube oEmbed for each linked episode | pg_cron pattern below — calls Supabase Edge Function OR Vercel cron route; updates `episodes.last_oembed_checked_at` and flags 404s |
| ADMN-09 | ≥30 approved clips across 4 domains | Curation work, not engineering; tracked via STATE.md "Curated clips approved" metric; board view auto-sort surfaces under-served domains |
| ADMN-10 | AI co-pilot suggests start/end, claim/rationale refinements, alt phrasings; explicit accept per suggestion | Vercel AI SDK 5 `streamObject` with zod schema below; renders side-by-side diff per UI-SPEC §"AI co-pilot panel" |
| ADMN-11 | Audit log of every AI suggestion + accept/reject decision | `clip_edits` table from Phase 1 schema; `action` enum extension + `payload JSONB` shape below |
| ADMN-12 | Ingest YouTube URL → fetch metadata + auto-captions; OR upload transcript doc (md/txt/vtt/srt) | `youtube-transcript-plus` (HIGH) + `oembed` fetch + Deepgram fallback (HIGH); manual upload via VTT/SRT parser (well-known small libs e.g. `node-webvtt`) |
| ADMN-13 | Ingested transcripts chunked + embedded into RAG corpus before any clips extracted | Chunking strategy below — ~512-token chunks with 64-token overlap; store in `transcript_chunks` table (already in Phase 1 schema) with HNSW index |
| ADMN-14 | Manual scrub-and-cut UI on ingested transcript | UI-SPEC §"Left pane (transcript)" — virtualized word list + click/shift-click selection + keyboard shortcuts |
| ADMN-15 | No clip-length cap; non-blocking editorial hint surfaced inline | UI-SPEC metadata form: 12px Geist Mono hint below claim field; `MEDICAL_REVIEW.md` LGL-08 update |
| ADMN-16 | Inline "add podcast" form when ingesting from podcast not in DB | shadcn Combobox with "Create new" affordance; inserts `podcasts` row with `name, host, trust_tier` |
| LGL-01 | Health disclaimer on every habit card + public habit page + onboarding flow | Phase 2 ships disclaimer COMPONENT + ensures editor never lets curator approve without LGL-08 hint visible; full disclaimer rendering on cards is Phase 3 |
| LGL-02 | DMCA contact email + 48h SLA at `/legal/dmca` | Static Next.js page under `(legal)/legal/dmca/page.tsx`; copy below |
| LGL-03 | One-click admin "remove episode + clips + blacklist" | Server action `removeEpisodeAndBlacklist(episodeId)` — cascades to clips, inserts `episode_blacklist` row preventing re-ingest |
| LGL-08 | `MEDICAL_REVIEW.md` clip-length editorial guidance | Doc-only change; copy below |
| AION-10 | 20-transcript hand-graded hallucination eval set; CI runs against current prompts; regressions fail build | GA5 above — fixture format + judge prompt + GitHub Actions workflow below |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **GSD workflow enforcement** — no direct Edit/Write outside a GSD workflow.
- **UI-DESIGN.md is source of truth** for color tokens, typography (Newsreader / Geist Sans / Geist Mono), spacing. Phase 2 admin uses warm-paper-sage tokens; no new color values.
- **`<YouTubeEmbed>` rule** — admin clip editor uses real `<YouTubeEmbed>` from `@next/third-parties/google` (UI-SPEC §"Top-right pane (player)"). Custom waveform is reserved for marketing landing in Phase 4.
- **AION-09 LLM wrapper** — every LLM call goes through `packages/core/llm/` (enforced via Biome noRestrictedImports from Phase 1). No direct Anthropic/OpenAI SDK imports in routes or components.
- **Deep-link only / no audio/video storage** — clip editor offers no upload affordances for media.
- **Drizzle for all DB access** — Supabase Auth tables excepted.
- **`prepare: false`** on the Postgres driver when using Supabase pooled connection.
- **No hardcoded secrets**; OpenAI / Anthropic / Deepgram keys via env, validated at startup.
- **Strict TypeScript**, `strict: true`, immutable patterns (no mutation), files <800 lines.
- **Biome lint + format** (already in Phase 1); pre-commit hooks via Husky + lint-staged.
- **Tests** — vitest for unit + component, playwright for E2E; CI runs lint + typecheck + test + build per PR.
- **Conventional commits**; no `Co-Authored-By` (settings.json disables attribution globally).

## Standard Stack

### Core (already locked, present in repo after Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x (App Router) | Server actions + route handlers + admin route group | Already locked |
| React | 19.x | UI | Required by Next 16 |
| TypeScript | 5.6+ strict | Type system | Already locked |
| Drizzle ORM | 0.36+ | DB access + migrations | Already locked; SQL-shaped for pgvector + tsvector |
| Supabase Auth | bundled | RLS + curator role gate | Already locked from Phase 1 |
| pgvector | 0.8.2 | Embeddings on `clips.embedding` + `transcript_chunks.embedding` (HNSW from Phase 1) | Already locked |
| `@supabase/ssr` | latest | Server-side session in admin routes | Already locked |
| `@next/third-parties` | latest | `<YouTubeEmbed>` in clip-editor player pane | Already locked (UI-SPEC) |
| `react-hook-form` + `@hookform/resolvers/zod` | latest | Metadata form | Already locked |
| `zod` | 3.x | Validation everywhere (server actions, AI structured outputs, fixtures) | Already locked |

### New to Phase 2 (recommended for planner to install)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `youtube-transcript-plus` | latest (verify with `npm view youtube-transcript-plus version`) | Fetch YouTube auto-captions + word/segment timestamps | TypeScript-first, active maintenance, supports custom fetch (proxy-friendly), explicit caption-track selection. Better than `youtube-transcript` (lighter but less typed). Alternative: `youtubei.js` if upstream proves brittle — abstract behind `TranscriptProvider`. |
| `@deepgram/sdk` | latest (v3+) | Deepgram prerecorded API client for fallback transcription | Official SDK, Node-friendly, supports `prerecorded` endpoint with `model: 'nova-3'`, `smart_format: true`, `punctuate: true`, `diarize: true`, `utterances: true`, word-level `words[]` timestamps included at no extra cost. Pricing ~$0.0043/min prerecorded → 3hr episode ≈ $0.77 — well within Phase 2 budget for ~30 episodes. |
| `node-webvtt` (or `subtitle` / `webvtt-parser`) | latest | Manual VTT/SRT upload parser (ADMN-12 fallback path) | Stable, tiny, handles cue + word-level timestamps. Planner can pick one — `subtitle` covers both VTT and SRT in one lib. |
| `react-resizable-panels` | latest | Three-pane workspace (UI-SPEC locked) | Already chosen in UI-SPEC. |
| `@dnd-kit/core` + `@dnd-kit/sortable` | latest | Kanban drag-to-advance (UI-SPEC locked) | Already chosen. Accessibility wrappers via `@dnd-kit/utilities`. |
| `@tanstack/react-virtual` | latest | Virtualize transcript words (~20K words / 3hr) (UI-SPEC locked) | Already chosen. |
| `ai` (Vercel AI SDK) | 5.x | Streaming AI co-pilot via `streamObject` + zod schema | Already locked in CLAUDE.md; SDK 5 adds typed streaming + tool calling + provider-level tool caching for Anthropic. |
| `@ai-sdk/anthropic` + `@ai-sdk/openai` | latest | Provider plugins behind `packages/core/llm` wrapper | Already locked. |
| `oembed` (or just `fetch` against `https://www.youtube.com/oembed?url=…&format=json`) | n/a | YouTube oEmbed metadata + availability ping (ADMN-08) | No library needed — single GET, parse JSON, store `title`, `author_name`, `thumbnail_url`. 404 ⇒ flag clip. |
| `diff` (jsdiff) | latest | Side-by-side diff rendering for AI co-pilot suggestions | Word/line diff util, render output styled per UI-SPEC §"AI co-pilot panel" (added = sage soft bg; removed = strikethrough `--color-ink-4`). |

### Already in repo (do not reinstall)
- `vitest`, `@testing-library/react`, `playwright` — from Phase 1 `FND-05`.
- shadcn primitives — UI-SPEC adds `dialog`, `tabs`, `select`, `textarea`, `checkbox`, `tooltip`, `badge`, `dropdown-menu`, `form`, `toast` via shadcn CLI.
- `pino` — for server logging (already locked).
- `lucide-react` — admin chrome icons (UI-SPEC permitted).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `youtube-transcript-plus` | `youtubei.js`, `youtube-captions-scraper`, `youtube-caption-extractor` | `youtubei.js` is heavier (full Innertube client) but more resilient when YouTube changes scraping endpoints. Abstract behind `TranscriptProvider` so swap is trivial. |
| Deepgram | AssemblyAI, OpenAI Whisper API, faster-whisper self-host | Deepgram Nova-3 has best price/quality in 2026 + word-level timestamps free + diarization free + Node SDK quality. OpenAI Whisper API has no diarization. AssemblyAI is comparable but slightly pricier. faster-whisper is Phase 5 worker territory, not MVP. |
| Vercel AI SDK 5 | Direct Anthropic SDK + manual streaming | AI SDK gives provider-agnostic `streamObject` with zod schema validation, tool-streaming, and works behind the `packages/core/llm` wrapper. Direct SDK loses the wrapper's noRestrictedImports gate. |
| `react-resizable-panels` | `allotment`, custom flexbox | `react-resizable-panels` is the de-facto pick for App Router (works with SSR), accessibility built-in, locked in UI-SPEC. |
| `@dnd-kit/core` | `react-beautiful-dnd` (unmaintained), `dnd-kit-sortable-tree` | `@dnd-kit` is the active maintained TS-first option for 2026, locked in UI-SPEC. |
| Application-layer cascade (server-action transaction) | Postgres trigger | App-layer is easier to test (vitest covers it), easier to audit (one place per action), no migration-time foot-gun. Locked in CONTEXT Open Items as likely application-layer. |

### Installation
```bash
pnpm add -F web youtube-transcript-plus @deepgram/sdk subtitle ai @ai-sdk/anthropic @ai-sdk/openai react-resizable-panels @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @tanstack/react-virtual diff
pnpm add -F web -D @types/diff
# shadcn additions per UI-SPEC
pnpm dlx shadcn@latest add dialog tabs select textarea checkbox tooltip badge dropdown-menu form toast
```

**Version verification (planner — run before pinning):**
```bash
npm view youtube-transcript-plus version
npm view @deepgram/sdk version
npm view ai version
npm view @ai-sdk/anthropic version
npm view @ai-sdk/openai version
npm view react-resizable-panels version
npm view @dnd-kit/core version
npm view @tanstack/react-virtual version
npm view subtitle version
npm view diff version
```

## Architecture Patterns

### Recommended File Structure (additions on top of Phase 1)

```
apps/web/
├── app/
│   ├── (admin)/
│   │   └── curate/
│   │       ├── page.tsx                        # Kanban board (default landing)
│   │       ├── ingest/
│   │       │   └── page.tsx                    # Transcript ingestion form
│   │       ├── editor/
│   │       │   └── [clipId]/
│   │       │       └── page.tsx                # Three-pane editor (server component shell)
│   │       └── _components/
│   │           ├── board/                      # Kanban + columns + cards + dnd-kit wiring
│   │           ├── editor/                     # ThreePanePanels, TranscriptPane, PlayerPane, MetadataTab, CopilotTab
│   │           ├── copilot/                    # SuggestionCard, DiffView, AION10Badge, AuditToast
│   │           ├── ingest/                     # IngestionForm, ProgressSteps
│   │           ├── removal/                    # RemovalDialog
│   │           └── shared/                     # AddPodcastInlineCombobox, KeyboardCheatsheet
│   ├── api/
│   │   └── admin/
│   │       └── copilot/
│   │           └── stream/route.ts             # AI SDK streamObject endpoint
│   ├── legal/
│   │   └── dmca/page.tsx                       # LGL-02 static page
│   └── actions/
│       └── curate/                             # All server actions: approveClip, rejectClip, ingestUrl, removeClip, removeEpisodeAndBlacklist, addPodcast
├── components/
│   └── disclaimer/HealthDisclaimer.tsx         # LGL-01 scaffolding (reused in Phase 3)
└── lib/
    └── curate/
        ├── chunking.ts                          # transcript → 512-tok chunks w/ 64 overlap
        └── hardBlockKeywords.ts                 # ADMN-06 keyword denylist

packages/core/
├── transcripts/                                 # NEW package surface
│   ├── index.ts                                 # TranscriptProvider interface + factory
│   ├── youtube.ts                               # YouTube auto-captions provider (youtube-transcript-plus)
│   ├── deepgram.ts                              # Deepgram fallback provider
│   ├── manual.ts                                # VTT/SRT manual upload provider
│   └── normalize.ts                             # → unified WordTimestamped[] + sentence[] shape
├── llm/                                         # (from Phase 1) — copilot wrappers added here
│   ├── copilot/
│   │   ├── suggestStartEnd.ts
│   │   ├── refineClaim.ts
│   │   ├── proposeAlternative.ts
│   │   └── schemas.ts                           # zod schemas for streamObject outputs
│   └── grounding/
│       └── similarityCheck.ts                   # AION-10 production cosine-≥0.85 check
├── embeddings/
│   ├── embedClip.ts                             # text-embedding-3-small via OpenAI provider
│   └── embedTranscriptChunks.ts                 # batched (≤100/call) chunk embed
└── prompts/
    ├── suggest-start-end.md
    ├── refine-claim.md
    └── propose-alternative.md

packages/db/
└── migrations/
    ├── 0NN_transcripts.sql                     # transcripts table + GIN tsv index
    ├── 0NN_clip_edits_actions.sql              # extend clip_edits.action enum + payload jsonb
    ├── 0NN_clips_removal.sql                   # removed_at, removal_reason, removal_notes, takedown_ref_url
    ├── 0NN_episode_blacklist.sql               # LGL-03 blacklist after takedown
    └── 0NN_aion10_fixtures.sql                 # dev-only fixture-candidates table

tests/eval/aion-10/
├── fixtures.jsonl                               # 20 hand-graded entries by phase end
├── judge-prompt.md                              # LLM-as-judge prompt
└── runner.ts                                    # vitest runner for CI

.github/workflows/
└── aion10-eval.yml                             # gated on packages/core/llm/** or **/prompts/**

MEDICAL_REVIEW.md                                # LGL-08 update: clip-length editorial guidance
```

### Pattern 1: TranscriptProvider Abstraction (GA3 + ADMN-12)

**What:** Single interface; YouTube-captions tried first, Deepgram fallback if missing/low-confidence, manual upload as third path.

**When to use:** Every transcript fetch in `apps/web/app/api/admin/...` and curation server actions.

**Example:**
```typescript
// packages/core/transcripts/index.ts
export type WordTimestamped = {
  text: string;
  start: number;        // seconds, float
  end: number;          // seconds, float
  confidence?: number;  // 0..1 (deepgram), undefined for YouTube captions
};

export type TranscriptResult = {
  videoId: string;
  source: 'youtube_captions' | 'deepgram' | 'manual';
  language: string;     // 'en', 'en-US', etc
  words: WordTimestamped[];
  rawText: string;      // join of words for tsvector
  segments: Array<{ start: number; end: number; text: string }>; // paragraph-level for UI
  fetchedAt: Date;
};

export interface TranscriptProvider {
  canHandle(input: { url?: string; file?: { name: string; content: string } }): boolean;
  fetch(input: { url?: string; file?: { name: string; content: string } }): Promise<TranscriptResult>;
}

// Orchestrator
export async function fetchTranscript(input: { url?: string; file?: ... }): Promise<TranscriptResult> {
  if (input.file) return manualProvider.fetch(input);
  const yt = await youtubeCaptionsProvider.fetch(input).catch(() => null);
  if (yt && yt.words.length > 50 && (yt.language === 'en' || yt.language.startsWith('en-'))) return yt;
  return deepgramProvider.fetch(input);  // ~2min, $0.005/episode
}
```

### Pattern 2: Embed-on-Approve Server Action (ADMN-04)

**What:** Approval is a transactional server action; embedding write is part of the same atomic flow but tolerant of OpenAI transient failures (clip stays in Review with `retry embed` button per UI-SPEC error state).

**Example:**
```typescript
// app/actions/curate/approveClip.ts
'use server';
export async function approveClip(input: ApproveClipInput) {
  const parsed = approveClipSchema.parse(input);  // includes ADMN-06 hard-block via .refine()
  return await db.transaction(async (tx) => {
    const clip = await tx.update(clips)
      .set({ status: 'published', publishedAt: new Date() })
      .where(eq(clips.id, parsed.clipId))
      .returning();
    try {
      const embedding = await embedClip(`${clip.claim}\n\n${clip.rationale}`);  // OpenAI text-embedding-3-small
      await tx.update(clips).set({ embedding }).where(eq(clips.id, parsed.clipId));
    } catch (err) {
      logger.warn({ err, clipId: parsed.clipId }, 'embed-on-approve failed; clip published, embedding deferred');
      // do NOT throw — UI surfaces "retry embed" affordance
    }
    await tx.insert(clipEdits).values({ clipId: parsed.clipId, action: 'approved', payload: {...} });
    return clip;
  });
}
```

### Pattern 3: AI Co-pilot Streaming (ADMN-10 + AION-10 production check)

**What:** Server route handler streams a typed object via `streamObject`; client renders progressively; on stream-complete, server runs cosine-similarity grounding check against transcript spans and tags suggestion with similarity score (UI surfaces ⚠ badge if <0.85).

**Example:**
```typescript
// app/api/admin/copilot/stream/route.ts
import { streamObject } from 'ai';
import { llm } from '@core/llm';  // provider-wrapper from Phase 1

export async function POST(req: Request) {
  const { kind, clipId, selection, freeText } = await req.json();
  const prompt = await buildPrompt(kind, { clipId, selection, freeText });
  const schema = suggestionSchema[kind];  // zod schema per preset

  const result = streamObject({
    model: llm.anthropic('claude-sonnet-4'),  // wrapper
    schema,
    prompt,
    onFinish: async ({ object }) => {
      const similarity = await groundingCheck(object, clipId);
      await db.insert(clipEdits).values({
        clipId, action: 'ai_suggested',
        payload: { kind, suggestion: object, similarity, freeText },
      });
    },
  });
  return result.toTextStreamResponse();
}
```

### Pattern 4: Transcript Chunking for RAG (ADMN-13)

**What:** Chunk transcripts into ~512-token windows with 64-token overlap, aligned to sentence boundaries, store in `transcript_chunks` with `(episode_id, chunk_index, start_seconds, end_seconds, text, embedding vector(1536))`. HNSW index on embedding (Phase 1). Embed in batches of 100 to OpenAI (single API call → 100 vectors).

**Why this shape:** 90-second-clip-sized retrieval means chunks should be ~1.5–3× clip length so a clip-claim query retrieves the *containing* chunk + a buffer chunk. 512 tokens ≈ 350–400 words ≈ ~150 seconds of speech at typical podcast pace. Overlap prevents claim split across chunk boundary.

```typescript
// lib/curate/chunking.ts
export function chunkTranscript(words: WordTimestamped[], opts = { tokensPerChunk: 512, overlapTokens: 64 }) {
  // approximation: 1 token ≈ 0.75 words for English
  const wordsPerChunk = Math.round(opts.tokensPerChunk / 0.75);
  const overlapWords = Math.round(opts.overlapTokens / 0.75);
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk - overlapWords) {
    const slice = words.slice(i, i + wordsPerChunk);
    if (slice.length === 0) break;
    chunks.push({
      chunkIndex: chunks.length,
      startSeconds: slice[0].start,
      endSeconds: slice[slice.length - 1].end,
      text: slice.map((w) => w.text).join(' '),
    });
  }
  return chunks;
}
```

### Pattern 5: HNSW + Iterative Scan with Metadata Filters

**What:** pgvector 0.8.2 supports iterative scans (`SET hnsw.iterative_scan = 'relaxed_order'`) to handle filtered cosine queries that would otherwise return <topK after the filter. Use this for queries like "find chunks where domain='sleep' AND speaker='Dr X' ORDER BY embedding <=> $1".

**Example:**
```sql
-- Per-request in Drizzle (set locally so it doesn't leak to other queries)
SET LOCAL hnsw.iterative_scan = 'relaxed_order';
SET LOCAL hnsw.max_scan_tuples = 20000;
SELECT id, text, embedding <=> $1 AS distance
FROM transcript_chunks
WHERE episode_id IN (SELECT id FROM episodes WHERE domain = 'sleep')
ORDER BY embedding <=> $1
LIMIT 10;
```

For Phase 2 specifically, retrieval is mostly per-clip context (Phase 3's onboarding RAG is heavier). Keep the iterative-scan setting wrapped in a helper.

### Pattern 6: Daily oEmbed Cron (ADMN-08)

**What:** pg_cron schedules a SQL function that calls a Supabase Edge Function (or Vercel cron HTTP) once daily; the function iterates `episodes` rows, hits `https://www.youtube.com/oembed?url=…&format=json` for each, marks 404s.

**Recommended implementation (pg_cron native is preferred — zero new deps):**
```sql
-- migrations/0NN_oembed_cron.sql
SELECT cron.schedule(
  'check-episode-availability',
  '0 4 * * *',           -- 04:00 UTC daily
  $$SELECT net.http_get('https://<vercel-domain>/api/cron/oembed-check', ARRAY[
      ('authorization','Bearer ' || current_setting('app.cron_secret'))::http_header
    ])$$
);
```
The Vercel route handler iterates episodes, fetches oEmbed, updates `episodes.last_oembed_checked_at` + `episodes.source_unavailable_at` when 404. Cascade to clips happens via separate UPDATE matching `clips.episode_id`.

### Pattern 7: `clip_edits.payload` Audit Shape (ADMN-11)

Recommended `action` enum (extends Phase 1):
- `created`, `updated`, `approved`, `rejected`
- `ai_suggested`, `ai_accepted`, `ai_rejected`
- `removed`, `unremoved`
- `embedded`, `embed_failed`

`payload JSONB` shape per action:
```typescript
type AiSuggestedPayload = {
  kind: 'suggest-start-end' | 'refine-claim' | 'propose-alternative';
  suggestion: object;   // matches kind's zod schema
  similarity?: number;  // AION-10 cosine score
  freeText?: string;
};
type RemovedPayload = {
  reason: 'dmca' | 'factual-error' | 'medical-risk' | 'speaker-request' | 'other';
  notes?: string;
  takedownRefUrl?: string;
};
```

### Anti-Patterns to Avoid

- **Direct OpenAI/Anthropic SDK calls in route handlers** — violates AION-09 wrapper rule. All LLM access via `packages/core/llm`.
- **YouTube `<iframe>` directly in player pane** — UI-SPEC mandates `<YouTubeEmbed>` (lite-embed) for SSR + bundle savings even in admin.
- **Storing transcripts in object storage at MVP** — CONTEXT GA4 locked: text-blob in Postgres until R2 lands.
- **DB triggers for cascade workflows** — harder to unit-test; CONTEXT open-items leans application-layer.
- **Inline `clip_edits` rows without `payload` validation** — payload is JSONB; planner must declare per-action zod schemas and validate before insert.
- **Embedding writes in client components** — server-action only; keys never reach browser.
- **Production runtime LLM-as-judge** — too slow + expensive per turn. Production check is cheap cosine-similarity only; LLM-as-judge runs only in CI on fixtures (GA5).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Three-pane resizable workspace | Custom flex with drag handlers | `react-resizable-panels` | Keyboard accessibility, persisted-size hooks, SSR-safe, locked in UI-SPEC |
| Kanban drag-and-drop | Custom HTML5 drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` | A11y wrappers (keyboard drag via space → arrow → space), sensors, collision detection — non-trivial to get right |
| 20K-word transcript renderer | Plain `.map()` over words | `@tanstack/react-virtual` | Without virtualization a 3hr episode locks the main thread. UI-SPEC locked. |
| YouTube caption fetch | Custom Innertube reverse-engineering | `youtube-transcript-plus` | Tracks YouTube's evolving caption-track JSON; battle-tested |
| Transcription | Local Whisper integration | `@deepgram/sdk` Nova-3 | Self-host Whisper is Phase 5 worker territory; ~$0.77/3hr episode is acceptable |
| VTT/SRT parsing for manual upload | Regex parsers | `subtitle` npm package | Handles edge cases (multiline cues, malformed timestamps, cue settings) |
| Diff rendering | Custom char-by-char loop | `diff` (jsdiff) `.diffWords()` | Years of edge-case handling |
| YouTube embed | Raw `<iframe>` | `<YouTubeEmbed>` from `@next/third-parties/google` | ~500KB bundle savings, lite-embed facade, Next.js-blessed |
| LLM streaming | Manual SSE plumbing | Vercel AI SDK 5 `streamObject` | Typed zod schema, partial-object yielding, tool-call streaming, provider-agnostic |
| OAuth / session | Custom JWT | Supabase Auth + RLS (from Phase 1) | Already done |
| Postgres full-text search | LIKE / regex | `tsvector` GENERATED column + GIN index (GA4 locked) | Native FTS with stemming + ranking |
| Cron | Self-hosted scheduler | Supabase pg_cron + Vercel cron | Already in stack; no new dep |
| Embedding batching | Per-row calls | `openai.embeddings.create({ input: string[] })` batched ≤100 | One API call per 100 vectors → 100× cost reduction on rate-limited endpoint |

**Key insight:** Phase 2's curation tooling is **integration work, not invention**. Every hard problem (transcript fetch, transcription fallback, virtualization, drag-and-drop, AI streaming, diff render, FTS) has a battle-tested package. The novel work is (a) the `TranscriptProvider` orchestration shape, (b) the `clip_edits.payload` audit shape, and (c) the AION-10 fixture format + judge prompt — the rest is glue.

## Common Pitfalls

### Pitfall 1: YouTube caption fetch breaks silently
**What goes wrong:** YouTube changes Innertube response shape; `youtube-transcript-plus` returns empty array; curator sees "No captions found" and falls back to Deepgram unnecessarily, burning $$.
**Why:** Unofficial API.
**How to avoid:** Treat empty-array as a *distinct* result from "captions absent." Verify by fetching `https://www.youtube.com/api/timedtext?type=list&v=VIDEO_ID` and checking caption-track existence first. Log version of lib + response shape on every fetch. Abstract behind `TranscriptProvider` so swap to `youtubei.js` is one-file change.
**Warning signs:** Sudden cluster of fallback-to-Deepgram events without correlated YouTube outage.

### Pitfall 2: Embedding cost explosion on transcript chunk ingestion
**What goes wrong:** Curator ingests a 3hr episode → ~20K words → ~150 chunks of 512 tokens → 150 individual OpenAI calls → rate-limited + slow + per-call overhead.
**Why:** Naive `for-each-chunk` loop.
**How to avoid:** Batch `openai.embeddings.create({ input: chunks.slice(0, 100).map((c) => c.text) })`. text-embedding-3-small allows up to 2048 inputs per call but 100 is a sane default for retry granularity.
**Warning signs:** Ingestion takes >30s after captions fetched; OpenAI 429s.

### Pitfall 3: Pooled-connection prepared-statement conflict
**What goes wrong:** Drizzle queries against Supabase's transaction-pooled connection fail with `prepared statement already exists`.
**Why:** PgBouncer transaction mode doesn't preserve session state between checkouts.
**How to avoid:** `postgres(url, { prepare: false })` on the driver (CLAUDE.md notes this; Phase 1 should already have it).
**Warning signs:** Random query failures in CI but not locally.

### Pitfall 4: AI co-pilot suggestions accepted before AION-10 grounding check completes
**What goes wrong:** `streamObject` yields partial object; curator clicks Accept before `onFinish` runs the cosine check; suggestion lacks `similarity` score.
**How to avoid:** Disable Accept button until stream completes (track via SDK's `state` field). Persist `clip_edits.payload.similarity = null` and surface a "checking grounding…" inline state if curator races it. UI-SPEC §"Loading / progress states" supports this with `Co-pilot thinking…` copy.
**Warning signs:** `clip_edits` rows with `action=ai_accepted` and `payload.similarity` missing.

### Pitfall 5: Hard-block keyword denylist (ADMN-06) too aggressive or too lax
**What goes wrong:** Too aggressive blocks legitimate clips ("Dr X recommends getting 7h sleep" matches "dose" via "doses"). Too lax misses real risk ("take 500mg of magnesium glycinate at bedtime").
**How to avoid:** Two-layer: (a) regex denylist for prescription-drug names + dosing patterns (`/\d+\s*(mg|mcg|g|ml|iu|units?|tablets?|capsules?|pills?)/i`), (b) explicit speaker assertion + claim review. Document in `MEDICAL_REVIEW.md` (LGL-08). Surface the matched pattern in the error toast so curator sees *why* it blocked.
**Warning signs:** Curator override requests; false-block reports.

### Pitfall 6: oEmbed cron rate-limits or false-positives
**What goes wrong:** YouTube oEmbed 404s for transient reasons (region block, throttling) → clips false-flagged as `removed_from_source`.
**How to avoid:** Require 3 consecutive daily 404s before flagging (`episodes.oembed_404_count` counter, reset on 200). Log + alert (Sentry) on >5% flap rate.

### Pitfall 7: Word-level timestamp drift between YouTube captions and player seek
**What goes wrong:** YouTube auto-captions have ~250ms timestamp jitter; clicking a word seeks 0.25s off and clips feel "wrong."
**How to avoid:** Snap selection to nearest-sentence-boundary start (rounded down) and nearest-pause end. Two number-input nudges (±0.1s) per GA2 cover the rest.

### Pitfall 8: Side-by-side diff confusing for short claim refinements
**What goes wrong:** A 12-word claim refinement renders as 12 strikethrough words + 14 sage-bg words; cognitive load high.
**How to avoid:** Use `diff.diffWords()` (word-level diff) not line-level for the claim field; use line-level for rationale (longer paragraphs). Test with vitest snapshot.

### Pitfall 9: AION-10 fixture leakage — promoting clips that came from same source as production prompts
**What goes wrong:** Fixtures drawn from same transcript pool as production usage → eval optimistic.
**How to avoid:** Reserve 3–5 episodes *never used* in the live corpus as eval-only. Document in `tests/eval/aion-10/README.md`.

### Pitfall 10: Streaming `streamObject` with Anthropic before tool-streaming support landed
**What goes wrong:** Older AI SDK 5 versions had streaming gaps for Anthropic structured outputs.
**How to avoid:** Pin AI SDK ≥5.0 *stable*; verify `streamObject` with Anthropic in a smoke test before building the full panel. (Known historical issue logged in vercel/ai #3422 — fixed in current versions; verify at pin time.)

### Pitfall 11: Virtualized transcript loses selection state on scroll
**What goes wrong:** `@tanstack/react-virtual` unmounts off-screen words; selection range stored in unmount-scoped state vanishes.
**How to avoid:** Store `selectionStartWordIndex` + `selectionEndWordIndex` in parent component state (or URL), render the highlight via CSS class derived from index, not DOM ref.

### Pitfall 12: Removal cascade leaves orphan habits visible to users
**What goes wrong:** Removal NULLs `habits.evidence_clip_id` but Phase 3 habit-card render path doesn't check for NULL → renders broken card.
**How to avoid:** Cascade is application-layer in server-action; same transaction inserts an admin-task row "needs new evidence." Phase 3 plans will treat NULL `evidence_clip_id` as a "tombstone" state. Document this in Phase 2 PLAN as a cross-phase contract.

## Code Examples

### Approval with hard-block + zod
```typescript
// app/actions/curate/schemas.ts
import { z } from 'zod';
import { hardBlockKeywords } from '@/lib/curate/hardBlockKeywords';

export const approveClipSchema = z.object({
  clipId: z.string().uuid(),
  claim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(4000),
  speakerStatus: z.enum(['verified', 'unverified', 'host']),
  domain: z.enum(['sleep', 'nutrition_gut', 'exercise_longevity', 'mental_health']),
  riskFlags: z.array(z.enum(['medical_advice', 'supplement', 'contraindication', 'general'])).min(1, 'risk_flags is mandatory'),
  startSec: z.number().min(0),
  endSec: z.number(),
  evidenceStrength: z.number().int().min(1).max(5),
}).refine((d) => d.endSec > d.startSec, 'end must be > start')
  .refine((d) => {
    const blob = `${d.claim}\n${d.rationale}`.toLowerCase();
    return !hardBlockKeywords.some((kw) => kw.test(blob));
  }, { message: "Can't publish: this clip touches prescription / dosing / treatment of a diagnosed condition. See MEDICAL_REVIEW.md." });
```

### AI suggestion zod schemas
```typescript
// packages/core/llm/copilot/schemas.ts
export const suggestStartEndSchema = z.object({
  startSec: z.number().min(0),
  endSec: z.number(),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string(),  // the transcript span the suggestion is grounded in — used by AION-10 cosine check
});

export const refineClaimSchema = z.object({
  refinedClaim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string(),
});

export const proposeAlternativeSchema = z.object({
  alternativeClaim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string(),
});
```

### AION-10 production grounding check
```typescript
// packages/core/llm/grounding/similarityCheck.ts
export async function groundingCheck(suggestion: { quotedSpan: string }, clipId: string): Promise<number> {
  const [span] = await embeddings.create({ input: [suggestion.quotedSpan] });
  const result = await db.execute(sql`
    SELECT 1 - (embedding <=> ${span}::vector) AS similarity
    FROM transcript_chunks
    WHERE episode_id = (SELECT episode_id FROM clips WHERE id = ${clipId})
    ORDER BY embedding <=> ${span}::vector
    LIMIT 1
  `);
  return result[0]?.similarity ?? 0;
}
```

### AION-10 CI workflow (sketch)
```yaml
# .github/workflows/aion10-eval.yml
name: AION-10 Hallucination Eval
on:
  pull_request:
    paths:
      - 'packages/core/llm/**'
      - '**/prompts/**'
      - 'tests/eval/aion-10/**'
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm vitest run tests/eval/aion-10/runner.ts --reporter=verbose
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_EVAL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_EVAL }}
      # vitest exits non-zero if <90% grounded OR >0% hallucinated
```

### Fixture row shape
```jsonl
{"id":"fx-001","episode_id":"yt-abc123","transcript_span_start":2538.0,"transcript_span_end":2615.5,"transcript_text":"…","ai_kind":"refine-claim","ai_input":{"current_claim":"Sleep is important","selection":"…"},"ai_output":{"refinedClaim":"…","rationale":"…","quotedSpan":"…"},"expected_grounded":true,"reviewer_notes":"…","reviewer":"curator-1","reviewed_at":"2026-05-15"}
```

### LGL-02 `/legal/dmca` content (skeleton)
```markdown
# DMCA Takedown Requests

We respect the rights of content creators. If you believe content on this site infringes your copyright, please contact us:

**Email:** dmca@<chosen-domain> (alias delivered via project email)
**Response SLA:** 48 hours from receipt during business days.

### Required information
- Identification of the copyrighted work
- Identification of the URL(s) of the allegedly infringing content
- Your contact information
- A statement of good-faith belief
- A statement of accuracy under penalty of perjury
- Your physical or electronic signature

Counter-notice procedure: see 17 U.S.C. § 512(g).
```

### LGL-08 `MEDICAL_REVIEW.md` clip-length addendum
```markdown
## Clip Length Editorial Guidance (LGL-08)

There is no hard cap on clip length. Editorial guidance:

1. **As detailed as needed to convey the claim, not more.** A 30-second clip with a clear claim is preferred over a 90-second clip padded with conversational filler.
2. **Sponsor-read offset rule.** If the episode contains a sponsor read within ±2 minutes of a candidate clip, shift the window to fully exclude the sponsor segment. Never include a sponsor-read sentence in a clip.
3. **Qualifier-must-be-in-window rule.** If the speaker qualifies a claim ("for most healthy adults", "if you don't have hypertension"), that qualifier MUST be inside the clip start/end. Splitting the claim from its qualifier is misrepresentation and breaks the transformative-use posture.
4. **Why this matters legally.** With no length cap, fair-use factor 3 (amount used) carries less weight. The defense rests harder on factor 1 (transformative use — operationalizing a habit) and factor 4 (no market harm — drives traffic back to DOAC via the prominent "Watch on Diary of a CEO" CTA).
5. **Hard exclusions.** Never approve clips covering prescription drugs, dosing of any substance, or treatment of diagnosed conditions (ADMN-06 enforces this at the database boundary).
```

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|-------------------------|--------------|--------|
| `youtube-transcript` (basic) | `youtube-transcript-plus` (typed, proxy-able, segments + words) | 2024–2025 | Better TS DX + ability to swap fetch impl for proxy when scraping breaks |
| Deepgram Nova-2 / Whisper API | Deepgram Nova-3 ($0.0043/min prerecorded) | 2025–2026 | Word-timestamps + diarization included; better English WER |
| pgvector IVFFlat | pgvector 0.8.2 HNSW + iterative scans for filters | 2024–2025 | Better recall under metadata filters; correct top-K under WHERE clauses |
| AI SDK 4 | AI SDK 5 (typed protocol, tool streaming, provider tool-caching) | Jul 2025 | Anthropic prompt-caching at tool level; typed streamObject |
| `react-beautiful-dnd` | `@dnd-kit/core` | 2023+ (RBD unmaintained) | Active maintenance, better a11y |
| Auth.js v5 | Supabase Auth (for this stack) / Better Auth (greenfield) | Sept 2025 (Auth.js + Better Auth team merge) | Supabase Auth remains correct for *this* project per CLAUDE.md |

**Deprecated/outdated to avoid:**
- `@supabase/auth-helpers-nextjs` — replaced by `@supabase/ssr` (already locked in Phase 1).
- IVFFlat index for new vector columns — HNSW is the 2026 default (Phase 1 should have already used HNSW).
- `react-beautiful-dnd` for the kanban — UI-SPEC locked `@dnd-kit/core`.

## Open Questions

1. **Does Phase 1's `clip_edits` table already declare the `payload JSONB` column and the extended `action` enum values?**
   - What we know: FND-06 lists `clip_edits` as part of the schema; CLAUDE.md confirms ADMN-11 audit-log purpose.
   - What's unclear: Whether the column exists and which enum values are pre-defined.
   - Recommendation: Planner's first task is to read `packages/db/schema.ts` and verify; migration in Phase 2 ADDS new enum values and/or `payload` column only if absent.

2. **Is the `transcript_chunks` table from Phase 1 schema HNSW-indexed already?**
   - What we know: FND-06 lists it; CLAUDE.md notes HNSW is locked.
   - What's unclear: Index actually created vs reserved.
   - Recommendation: Confirm in `migrations/` directory; add HNSW index in Phase 2 migration if not present.

3. **YouTube auto-caption confidence proxy.**
   - YouTube auto-captions don't expose a per-word confidence the way Deepgram does. GA3 says "low confidence → Deepgram fallback."
   - Recommendation: Use heuristic — caption-track `kind === 'asr'` AND English AND word-count >50 → accept; otherwise fallback. Document the heuristic; revisit if false-fallback rate is >10%.

4. **AI co-pilot temperature + top-p for claim refinement.**
   - Trade-off: low temp → bland; high temp → AION-10 grounding fails.
   - Recommendation: Start at `temperature=0.2` for refine-claim and suggest-start-end; `0.5` for propose-alternative. Tune against fixture eval scores.

5. **Single curator at MVP — do we need a "claimed-by" lock on board cards?**
   - CONTEXT GA7 doesn't mention it; single curator. Skip — add only if multi-curator becomes real (Phase 5+).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Postgres + pgvector 0.8.2 | All persistence + RAG | Assumed ✓ (Phase 1) | — | n/a (blocking) |
| Supabase (Auth + RLS + Storage) | Curator role gate + admin routes | Assumed ✓ (Phase 1) | — | n/a |
| Supabase `pg_cron` extension | ADMN-08 daily oEmbed | Available on Supabase Pro; available in self-host compose | — | Vercel cron route only (drop pg_cron path for self-host minimalism) |
| Supabase `pg_net` extension | pg_cron → HTTP cron handler | Available on Supabase | — | Vercel cron HTTP endpoint instead |
| OpenAI API key (`text-embedding-3-small`) | ADMN-04 + ADMN-13 | Provisioned at project level | — | None — blocking for embedding work |
| Anthropic API key (Sonnet 4.x + Haiku 4.5) | ADMN-10 co-pilot + AION-10 judge | Provisioned at project level | — | None — blocking |
| Deepgram API key | ADMN-12 fallback transcription | **Not yet provisioned** | — | Manual transcript upload path (ADMN-12 already supports VTT/SRT upload); blocking for ~10% of episodes lacking captions |
| Node 20+ | All build/runtime | Assumed ✓ (Phase 1) | — | n/a |
| pnpm | Monorepo PM | Assumed ✓ (Phase 1) | — | n/a |

**Missing dependencies with no fallback:**
- Deepgram key — Phase 2 plan must include a "provision Deepgram account + add `DEEPGRAM_API_KEY` to env" task. Cost during Phase 2 is bounded: 30 episodes × ~$0.77 worst-case = ~$23 if every episode lacks captions (most DOAC episodes have auto-captions, so realistic cost is ~$5).

**Missing dependencies with fallback:**
- pg_cron (for non-Supabase self-host) — Vercel cron is the fallback; document in self-host README.

## Validation Architecture

> Nyquist validation is currently disabled (`workflow.nyquist_validation: false`). Included for the planner to encode acceptance criteria.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (unit + component) + playwright (E2E) — from Phase 1 FND-05 |
| Config file | `vitest.config.ts` (workspace), `playwright.config.ts` at repo root |
| Quick run command | `pnpm vitest run` |
| Full suite command | `pnpm test` (vitest + playwright + typecheck + biome) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ADMN-03 | Clip metadata form validates required fields (claim, speaker, domain, risk_flags) | component | `pnpm vitest run apps/web/app/\(admin\)/curate/_components/editor/MetadataTab.test.tsx` | ❌ Wave 0 |
| ADMN-04 | Approving a clip writes embedding via OpenAI provider | unit (mock provider) | `pnpm vitest run apps/web/app/actions/curate/approveClip.test.ts` | ❌ Wave 0 |
| ADMN-05 | Risk_flags required at approval (zod rejection if empty) | unit | `pnpm vitest run apps/web/app/actions/curate/approveClip.test.ts` | ❌ Wave 0 |
| ADMN-06 | Hard-block keywords reject prescription/dosing claims | unit | `pnpm vitest run apps/web/app/actions/curate/approveClip.test.ts -t "hard-block"` | ❌ Wave 0 |
| ADMN-07 | `removed_from_source` episode cascades to clips | integration (test DB) | `pnpm vitest run apps/web/app/actions/curate/removeEpisodeAndBlacklist.test.ts` | ❌ Wave 0 |
| ADMN-08 | oEmbed cron handler marks 404'd episodes after 3 consecutive failures | unit + integration | `pnpm vitest run apps/web/app/api/cron/oembed-check.test.ts` | ❌ Wave 0 |
| ADMN-09 | ≥30 approved clips across 4 domains | manual / smoke query | `psql -c "select domain, count(*) from clips where status='published' group by domain"` | n/a (data) |
| ADMN-10 | AI co-pilot stream returns valid suggestion matching zod schema | integration (real provider, gated to nightly) OR contract test | `pnpm vitest run packages/core/llm/copilot/*.test.ts` | ❌ Wave 0 |
| ADMN-11 | Every AI suggestion + accept/reject writes clip_edits row | integration | `pnpm vitest run apps/web/app/actions/curate/copilot.test.ts` | ❌ Wave 0 |
| ADMN-12 | URL ingestion fetches captions OR falls back to Deepgram | integration (mocked) | `pnpm vitest run packages/core/transcripts/*.test.ts` | ❌ Wave 0 |
| ADMN-13 | Transcript chunks embedded and inserted into transcript_chunks | integration | `pnpm vitest run packages/core/embeddings/embedTranscriptChunks.test.ts` | ❌ Wave 0 |
| ADMN-14 | Word selection produces correct start/end timestamps | component | `pnpm vitest run apps/web/app/\(admin\)/curate/_components/editor/TranscriptPane.test.tsx` | ❌ Wave 0 |
| ADMN-15 | Editorial hint renders below claim field | component | (covered in MetadataTab.test.tsx) | ❌ Wave 0 |
| ADMN-16 | Inline "add podcast" creates podcasts row | integration | `pnpm vitest run apps/web/app/actions/curate/addPodcast.test.ts` | ❌ Wave 0 |
| LGL-01 | HealthDisclaimer component renders required copy | component | `pnpm vitest run apps/web/components/disclaimer/HealthDisclaimer.test.tsx` | ❌ Wave 0 |
| LGL-02 | `/legal/dmca` page renders email + 48h SLA | E2E | `pnpm playwright test e2e/legal-dmca.spec.ts` | ❌ Wave 0 |
| LGL-03 | One-click episode removal blacklists + cascades | integration | (covered in removeEpisodeAndBlacklist.test.ts) | ❌ Wave 0 |
| LGL-08 | `MEDICAL_REVIEW.md` contains clip-length guidance section | static / markdown lint | `grep -q "Clip Length Editorial Guidance" MEDICAL_REVIEW.md` | ❌ Wave 0 |
| AION-10 | Eval runner fails CI if <90% grounded or >0% hallucinated on fixtures | CI workflow | `pnpm vitest run tests/eval/aion-10/runner.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run --changed` (vitest changed-files mode)
- **Per wave merge:** `pnpm vitest run && pnpm playwright test`
- **Phase gate:** Full suite green + `pnpm exec tsc --noEmit` + `pnpm biome check` + AION-10 eval green + manual check: `select count(*) from clips where status='published'` ≥ 30 with all 4 domains represented.

### Wave 0 Gaps
- [ ] `apps/web/app/actions/curate/approveClip.test.ts` — covers ADMN-04, ADMN-05, ADMN-06
- [ ] `apps/web/app/actions/curate/removeEpisodeAndBlacklist.test.ts` — covers ADMN-07, LGL-03
- [ ] `apps/web/app/actions/curate/copilot.test.ts` — covers ADMN-10 + ADMN-11
- [ ] `apps/web/app/actions/curate/addPodcast.test.ts` — covers ADMN-16
- [ ] `apps/web/app/api/cron/oembed-check.test.ts` — covers ADMN-08
- [ ] `apps/web/app/(admin)/curate/_components/editor/MetadataTab.test.tsx` — covers ADMN-03, ADMN-15
- [ ] `apps/web/app/(admin)/curate/_components/editor/TranscriptPane.test.tsx` — covers ADMN-14
- [ ] `apps/web/components/disclaimer/HealthDisclaimer.test.tsx` — covers LGL-01
- [ ] `packages/core/transcripts/youtube.test.ts`, `deepgram.test.ts`, `manual.test.ts` — covers ADMN-12 (mock fetch)
- [ ] `packages/core/embeddings/embedTranscriptChunks.test.ts` — covers ADMN-13
- [ ] `packages/core/llm/copilot/*.test.ts` — covers ADMN-10 schema validation
- [ ] `tests/eval/aion-10/runner.ts` + `fixtures.jsonl` + `judge-prompt.md` — covers AION-10
- [ ] `e2e/legal-dmca.spec.ts` — covers LGL-02
- [ ] Shared test fixtures: `tests/helpers/testDb.ts` (already in Phase 1? verify), `tests/helpers/mockLlm.ts`, `tests/helpers/mockTranscriptProviders.ts`

## Sources

### Primary (HIGH confidence)
- Phase 1 deliverables (`STATE.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `CLAUDE.md`) — schema + RLS + curator role + stack pins
- CONTEXT.md (`02-CONTEXT.md`) — locked GA1–GA7 design decisions
- UI-SPEC.md (`02-UI-SPEC.md`) — locked component picks, tokens, copy
- [pgvector 0.8.0 release notes (Nile)](https://www.thenile.dev/blog/pgvector-080) — iterative scans + filter strategy
- [pgvector AWS Aurora 0.8.0 guide](https://aws.amazon.com/blogs/database/supercharging-vector-search-performance-and-relevance-with-pgvector-0-8-0-on-amazon-aurora-postgresql/) — HNSW filter performance
- [AI SDK 5 release blog (Vercel)](https://vercel.com/blog/ai-sdk-5) — streamObject + tool streaming + Anthropic provider features
- [AI SDK structured output docs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) — tool calling + provider options
- [`youtube-transcript-plus` GitHub](https://github.com/ericmmartin/youtube-transcript-plus) — features, fetch customization
- [Deepgram pricing page](https://deepgram.com/pricing) — Nova-3 prerecorded $0.0043/min, word timestamps included
- [Deepgram 2026 pricing breakdown](https://deepgram.com/learn/best-speech-to-text-apis-2026) — feature comparison

### Secondary (MEDIUM confidence)
- [`youtubei.js` npm](https://www.npmjs.com/package/youtubei.js) — alternate Innertube client
- [Markaicode pgvector production guide](https://markaicode.com/pgvector-rag-production/) — HNSW + hybrid search patterns
- [DBI services pgvector index update](https://www.dbi-services.com/blog/pgvector-a-guide-for-dba-part-2-indexes-update-march-2026/) — 2026-fresh index ops
- [AssemblyAI YouTube transcribe walkthrough](https://www.assemblyai.com/blog/transcribe-youtube-nodejs) — fallback approach reference

### Tertiary (LOW confidence — verify at implementation time)
- Exact AI SDK 5 minor version with stable Anthropic `streamObject` — pin against `npm view ai` at install.
- Exact `youtube-transcript-plus` resilience under recent YouTube changes — verify with one live fetch during Wave 1.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries locked in CLAUDE.md / UI-SPEC / CONTEXT.
- Architecture: HIGH — three-pane + audit-log + embed-on-approve are direct mappings from locked decisions.
- Pitfalls: MEDIUM-HIGH — drawn from documented library issues and project-specific risks; AION-10 fixture leakage is novel.
- AION-10 fixture/judge shape: MEDIUM — first-time design for this project; expect iteration during Wave 0.
- Deepgram cost / latency: HIGH — vendor pricing public; expected 30-episode burn ~$5–$25.

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — Deepgram pricing + AI SDK versioning shift quarterly; YouTube caption fetch lib resilience is fastest-moving variable)
