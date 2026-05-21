# Phase 3: User AI Loop (the Demo) — Research

**Researched:** 2026-05-13
**Domain:** RAG-grounded chat (Vercel AI SDK v6) + hybrid pgvector/tsvector retrieval + consistency-first habit dashboard + public SEO pages with OG images
**Confidence:** HIGH on stack APIs, MEDIUM on cluster algorithm + interview voice prompts (judgment calls)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Interview UX**
- **D-01:** Structured choices are the primary interaction mode. 3–4 answer chips per question. If AUTH-05c opted in, an open text field appears below the chips. If opted out, the field is hidden. **One UI, one code path** — no parallel chat-bubble mode.
- **D-02:** Progress dots at the top + domain badges. After turn 3, a visual callout highlights the priority domain ("Focusing on: Sleep").
- **D-03:** End flow = (1) "Analyzing your profile..." loading screen while Sonnet synthesizes → (2) "tell me more" free-form text step ("Anything else you'd like to share... eating habits, work schedule, why you developed certain habits") → (3) recommendations. The free-form text is bundled into the Sonnet synthesis prompt.

**Habit Adoption**
- **D-04:** Full-screen swipe stack. Right = adopt, left = skip.
- **D-05:** Brief confetti / check animation (~0.5s) on swipe-right; silent accumulation; final summary screen.
- **D-06:** Card face = title · claim quote (Newsreader italic) · domain badge · trigger · tiny action · clip thumbnail (lite-embed, tap-to-play, no autoplay) · speaker name. Two action buttons below for keyboard/mouse.

**Dashboard & Check-in**
- **D-07:** Consistency view is **per-habit** inside each habit card ("18/21 last 3 weeks") as the primary visual; streak smaller and secondary below. No global consistency section.
- **D-08:** Tri-state check-in opens a compact bottom sheet / popover with Done · Partial · Skip buttons. Optional mood (1–5) + note via expand arrow within the same sheet. Note only stored if AUTH-05c opted in.
- **D-09:** Habit graduation at 21 successful check-ins. Message: "This habit may now be part of your life 🌱". If user accepts: habit is **archived** + user prompted to adopt a new habit from a different domain. If declines: tracking continues; no re-prompt for ≥7 more check-ins.

**Habit Swap**
- **D-10:** Default to ROADMAP.md spec: cosine > 0.7 distance from current AND from a different cluster, same domain, 2 validated citations. Swap button on habit detail page. Claude chooses presentation style.

**Public Pages /h/[slug]**
- **D-11:** Rich editorial page. Claim (Newsreader italic, block-quoted) + speaker name + credentials + attribution note ("never implies endorsement") + DOAC episode context (episode title, date) + `<YouTubeEmbed>` (lite-embed, start/end timestamps, no chrome disabled) + trigger + tiny action + "Watch on Diary of a CEO" CTA + "Adopt this habit" CTA (signup if logged-out, auto-adopts if logged-in).
- **D-12:** OG image: habit title + YouTube video thumbnail (fetched at generation time) + speaker name. Warm paper palette.

### Claude's Discretion

- Swap presentation style (slide-in panel vs. inline modal vs. dedicated page) — simplest that works.
- Exact animation timing/easing for swipe stack.
- Loading skeleton design for interview turns and dashboard.
- Error state handling throughout.
- Exact `noindex` rules for dosing/supplement-adjacent public pages (PUB-04 + LGL-08 interaction).

### Deferred Ideas (OUT OF SCOPE)

- **Persistent AI chat** in `(app)` post-onboarding → Phase 4+.
- **Public DMCA form (LGL-02/LGL-03)** is already shipped in Phase 2 but must be **re-pickup'd** when `/h/[slug]` goes live, since this phase introduces the first public surface. Plan a small task.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AION-01 | Post-signup user enters AI onboarding interview | Vercel AI SDK v6 `useChat` + `streamText` (§Vercel AI SDK); structured turn-state schema (§Interview State Machine) |
| AION-02 | 6–10 turn adaptive conversation, 4 domains | State-machine pattern with `domainCoverage` counter + turn-budget guard (§Interview State Machine) |
| AION-03 | Each turn RAG-grounded via pgvector + tsvector | Hybrid RRF query against `clips` + `transcript_chunks` (§Hybrid Retrieval); tool-calling pattern (§Vercel AI SDK) |
| AION-04 | After turn 3, prioritize largest-gap domain | `domainCoverage` JSON in interview-run state; pin domain filter into retrieval after turn 3 |
| AION-05 | Output = structured profile jsonb (gap domains + summaries) | `generateObject` with Zod schema; persist to new `interview_runs` table |
| AION-06 | LLM never gives medical advice | System-prompt voice spec (§Voice Spec); risk-flag-aware retrieval filter |
| AION-07 | Free-text only sent to LLM if AUTH-05c opted in | Single code path — if opt-out, the field doesn't render and chip selections become the only `userPrompt` content |
| AION-08 | Cheap model for turns, Sonnet for synthesis | `LlmTier` already wired (§Model Tiering) |
| REC-01 | 3–5 personalized habit candidates ranked | `generateObject` with `HabitCandidate[]` Zod schema |
| REC-02 | 2–3 validated citations per habit; regenerate if <2 valid | Post-gen re-fetch against `clips` table by ID + claim-similarity check (§Citation Grounding) |
| REC-03 | ≥1 habit per identified-gap domain | Constraint in synthesis prompt + post-gen validator |
| REC-04 | Each habit has `trigger` + `tiny_action` | Zod schema requires both fields; reject if missing |
| REC-05 | User adopts 1+ proposed habits → creates `user_habits` rows | Swipe-stack UI; bulk-insert server action |
| REC-06 | User can re-run interview from settings | Each interview produces a new `interview_runs` row (don't overwrite) |
| HAB-01..10 | Dashboard + tri-state check-in + consistency primary + streak demoted + freeze rules | Schema additions needed: `user_habits.status` (`active`/`archived`/`graduated`), consistency view calc lib (§Streak/Consistency) |
| SWAP-01..04 | Substantively-different swap | Pre-computed `habit_templates.cluster_id` via k-means at curation time OR online-cluster proxy (§Swap Algorithm) |
| PUB-01..05 | Public `/h/[slug]` pages + OG image + structured data + sitemap + RLS proof | File-convention `opengraph-image.tsx` (§OG Images); `app/sitemap.ts`; RLS smoke test with anon Supabase client (§RLS Test Pattern) |
</phase_requirements>

## Summary

This phase is **the demo**. The Loom video you record at the end of Phase 3 is the artifact pitched to DOAC in Phase 5, so visual polish and the "wow" of citations-actually-validate are non-optional.

The stack is essentially fixed and well-supported in 2026: Next.js 16 App Router, Vercel AI SDK **v6** (not v5 — CLAUDE.md is one major version behind), Supabase Auth + RLS, Drizzle 0.45, pgvector 0.8.x with HNSW + iterative scan, OpenAI `text-embedding-3-small`, Anthropic Claude Sonnet 4.x for synthesis, Haiku 4.5 / GPT-4o-mini for cheap turns. The provider abstraction in `packages/core/src/llm/provider.ts` already exists from Phase 1 and *must* be the only seam to the LLM SDKs (AION-09 is enforced by Biome).

**Primary recommendation:** Build retrieval-as-a-library first (`packages/core/src/retrieval/`) with a single function `retrieveClips(query, filters)` that returns ranked + scored clips. Every downstream feature (interview turn, recommendation synthesis, swap) calls into it. Co-locate the citation post-validation function in the same package. **Do not put SQL in route handlers.**

The three non-obvious risks specific to this phase:

1. **AI SDK v6's `UIMessage.parts` model is materially different from v5** — chat code must use the new transport + `parts` array (text / tool-invocation / tool-result). Most online examples are still v5 or v4. Use only AI SDK v6 docs.
2. **`<YouTubeEmbed>` from `@next/third-parties` is still officially "experimental"** — pin a version, write a smoke test, document the fallback (raw iframe with `loading="lazy"`) in case it breaks during Next 16.x patches.
3. **Schema gaps exist.** `user_habits` has no `status`/`archivedAt` (needed for D-09 graduation). `habit_templates` has no `cluster_id` (needed for SWAP-02). No `interview_runs` table (needed for AION-05/REC-06). **Wave 1 plan must include a Drizzle migration before any feature code.**

## Standard Stack

### Core

| Library | Version (verified) | Purpose | Why Standard |
|---------|--------------------|---------|--------------|
| `next` | **16.2.6** | Web framework, App Router, route handlers, `next/og` ImageResponse | Already in `apps/web` |
| `react` / `react-dom` | **19.x** | UI; Server Components for non-interactive surfaces | Already wired |
| `ai` (Vercel AI SDK) | **6.0.180** | `streamText`, `generateObject`, `streamObject`, tool calling, `convertToModelMessages` | NOT YET INSTALLED — Wave 1 task. NB: CLAUDE.md says v5; verified registry shows v6 is current. |
| `@ai-sdk/react` | latest (paired with `ai@6`) | `useChat` hook with `DefaultChatTransport` | NOT YET INSTALLED |
| `@ai-sdk/openai`, `@ai-sdk/anthropic` | latest | Provider adapters used inside `packages/core/src/llm/*` (NOT in routes) | NOT YET INSTALLED — but wrap behind the existing `LlmProvider` interface; routes still see only the wrapper |
| `@next/third-parties` | **16.2.6** | `<YouTubeEmbed>` (lite-embed) | Already installed |
| `@supabase/ssr` + `@supabase/supabase-js` | 0.5 / 2.x | Server / browser clients, RLS-aware session | Already installed |
| `drizzle-orm` + `drizzle-kit` | **0.45.2** | All DB access; `postgres` driver with `prepare: false` | Already installed |
| `pgvector` (Postgres extension) | **0.8.2** | Cosine + HNSW + iterative scan | Already in DB |
| `zod` | 3.25.x | All Zod schemas: interview turn output, habit candidate, citation, swap result | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vercel/og` (or `next/og`) | shipped with Next 16 | OG image generation | Use `next/og`'s `ImageResponse` via file-convention `opengraph-image.tsx` — do NOT roll a custom `/api/og` handler |
| `react-hook-form` + `@hookform/resolvers` | already installed | Onboarding chip selections + "tell me more" + check-in mood/note form | Bottom sheet form, settings re-run, swap reason form |
| `sonner` | already installed | Toast for "Habit archived — adopt a new one?" graduation prompt | Yes — minimal cost |
| `lucide-react` | already installed | Icons (swipe arrows, chevron, leaf for graduation) | All UI |
| Framer Motion or CSS keyframes | NOT installed | Swipe stack animations + confetti | **Recommend CSS transforms + `view-transitions` API** to avoid a new dep. If swipe gestures get complex, add `framer-motion` to a single isolated component. |
| `pino` | already installed | Server logging for grounding-check failures, citation drop events | Yes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel AI SDK | Direct Anthropic + OpenAI SDKs | AI SDK gives provider-agnostic streaming + unified tool calling + `useChat`. Direct SDKs = more code, less switchable. **Decision: stay with AI SDK** (it's what `packages/core/src/llm/*` already wraps and the only path that gives the streaming `useChat` UX the interview needs). |
| `<YouTubeEmbed>` (experimental) | Manual `lite-youtube-embed` web component | The Next wrapper is a thin shim; if it breaks we can drop in lite-youtube-embed directly. **Decision: keep `<YouTubeEmbed>` but write one integration test asserting the iframe URL contains `start=` and `end=` query params.** |
| `opengraph-image.tsx` file convention | `/api/og/h/[slug]/route.ts` (custom route) | The file convention is the idiomatic Next 16 path: gets auto-cached, auto-tagged in `<head>`, sized correctly. The custom-route approach in CONTEXT.md (D-12) is older — **propose updating CONTEXT.md decision to use the file convention**. Behavior is identical to the user; file convention is less code. |
| K-means cluster_id at curation time | Online cosine bucketing at swap-request time | Pre-computed `cluster_id` is one INT column, one nightly cron job, deterministic. Online bucketing is more elastic but adds latency per swap. **Decision: pre-compute. Add `cluster_id INT` to `habit_templates`, k-means with k=4 per domain (so ~16 clusters total), recompute weekly via Supabase pg_cron, store in column.** This is small enough to be deterministic; falls back to "any clip with cosine > 0.7" if cluster_id is NULL. |

**Installation (Wave 1, single task):**

```bash
pnpm --filter @cited/web add ai@^6 @ai-sdk/react @ai-sdk/openai @ai-sdk/anthropic
# core wrappers will import the @ai-sdk/* packages inside packages/core; add there too:
pnpm --filter @cited/core add @ai-sdk/openai @ai-sdk/anthropic ai
```

**Version verification (run before locking versions):**

```bash
npm view ai version          # → 6.0.180 (verified 2026-05-13)
npm view next version        # → 16.2.6
npm view @next/third-parties version  # → 16.2.6
npm view drizzle-orm version # → 0.45.2
```

## Architecture Patterns

### Recommended Project Structure

```
apps/web/
├── app/
│   ├── (onboarding)/
│   │   └── onboarding/interview/
│   │       ├── page.tsx                      # Server component: load run state, render <InterviewClient/>
│   │       └── _components/
│   │           ├── InterviewClient.tsx       # useChat + UIMessage.parts → chip-renderer
│   │           ├── ChoiceChips.tsx
│   │           ├── ProgressDots.tsx
│   │           ├── DomainBadge.tsx
│   │           ├── SynthesisLoader.tsx
│   │           ├── TellMeMore.tsx            # free-form textarea step (D-03)
│   │           └── RecommendationStack.tsx   # swipe stack (D-04..06)
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx                      # Server component: query active habits + consistency
│   │   │   └── _components/
│   │   │       ├── HabitCard.tsx             # consistency bar PRIMARY, streak smaller below
│   │   │       ├── CheckInSheet.tsx          # bottom sheet popover, Done/Partial/Skip + mood + note
│   │   │       └── GraduationToast.tsx       # at 21-success prompt
│   │   └── habits/[id]/
│   │       ├── page.tsx
│   │       └── swap/route.ts                 # OR a panel; see Discretion D-10
│   ├── (public)/                             # NEW route group for /h/[slug]
│   │   └── h/[slug]/
│   │       ├── page.tsx                      # SSR rich editorial
│   │       ├── opengraph-image.tsx           # file-convention OG image (replaces D-12 /api/og)
│   │       └── _components/HabitEditorial.tsx
│   ├── api/
│   │   ├── interview/route.ts                # POST: streamText with tools for clip retrieval
│   │   ├── synthesize/route.ts               # POST: Sonnet, generateObject<HabitCandidate[]>
│   │   ├── swap/route.ts                     # POST: returns swap proposal (substantively-different)
│   │   └── check-in/route.ts                 # POST: tri-state check-in (or use Server Action)
│   ├── sitemap.ts                            # dynamic sitemap of published habit_templates
│   └── robots.ts                             # if needed for PUB-04 noindex rules
│   └── actions/
│       ├── adopt-habit.ts                    # Server Action: bulk-insert user_habits
│       ├── check-in.ts                       # Server Action: tri-state with streak rollover
│       ├── archive-habit.ts                  # Server Action: graduation flow (D-09)
│       └── re-run-interview.ts               # Server Action: REC-06
packages/core/src/
├── retrieval/
│   ├── hybridSearch.ts                       # SQL helper: pgvector + tsvector + RRF
│   ├── retrieveClips.ts                      # high-level: takes query + filters, returns ranked clips
│   └── retrieveTranscriptChunks.ts           # for source-grounding when no published clip exists
├── interview/
│   ├── stateMachine.ts                       # turn budget, gap detection, "enough info" predicate
│   ├── voiceSpec.ts                          # system prompt + persona discipline (≤3 sentences, no emoji)
│   ├── tools.ts                              # AI SDK tool definitions: fetch_relevant_clips, etc.
│   └── schemas.ts                            # Zod: TurnOutput, InterviewProfile, HabitCandidate, Citation
├── recommendations/
│   ├── synthesize.ts                         # Sonnet generateObject
│   ├── validateCitations.ts                  # post-gen re-fetch + claim cosine check
│   └── regenerate.ts                         # if <2 valid citations remain, regenerate
├── swap/
│   ├── cluster.ts                            # k-means on clip embeddings, write cluster_id
│   └── findSwap.ts                           # cosine>0.7 AND different cluster_id, same domain
└── habits/
    ├── consistency.ts                        # "18/21 last 3 weeks" calculation
    ├── streak.ts                             # rollover + freeze auto-apply logic
    └── graduation.ts                         # 21-success check predicate
packages/db/src/schema/
├── interview-runs.ts                         # NEW: id, userId, profileJson, completedAt, runIndex
└── (existing schemas — see "Schema Gaps" below for additions)
```

### Pattern 1: Retrieval-as-a-library + LLM tool

**What:** Every retrieval site (interview turn, synthesis, swap, eval) calls a single function. The LLM receives retrieval as an *AI SDK tool* during the interview so the model can ask for more evidence mid-turn.

**Why:** Single source of truth for ranking, filtering, RLS-context, RRF weighting. Tests target one function. The LLM-tool surface keeps prompts honest: when the model wants to claim something, it must call the tool first and ground in returned IDs.

```typescript
// packages/core/src/retrieval/retrieveClips.ts
import { sql } from 'drizzle-orm';
import type { Database } from '@cited/db';

export type ClipRetrievalFilters = {
  domains?: ('sleep' | 'nutrition_gut' | 'exercise_longevity' | 'mental_health')[];
  excludeRiskFlags?: string[];        // e.g. ['supplement','medical_advice'] for interview turns
  excludeClipIds?: string[];          // for swap (exclude the current habit's clips)
  speakerStatus?: ('verified' | 'unverified' | 'host')[];
};

export type RankedClip = {
  clipId: string;
  similarityScore: number;        // RRF-combined
  vectorScore: number;
  textScore: number;
  claim: string;
  speaker: string;
  domain: string;
};

export async function retrieveClips(
  db: Database,
  embedQuery: number[],          // 1536-dim from OpenAI text-embedding-3-small
  textQuery: string,             // for tsvector match
  filters: ClipRetrievalFilters,
  limit = 5,
): Promise<RankedClip[]> {
  // RRF over pgvector cosine + tsvector full-text; see Pattern 2 SQL.
  // Caller supplies embedQuery so embedding cost is observable + cacheable.
}
```

### Pattern 2: Hybrid retrieval SQL (pgvector + tsvector + RRF)

**What:** Combine cosine-similarity rank and full-text rank via Reciprocal Rank Fusion. Apply metadata filters in a CTE *before* ANN so HNSW iterative scan kicks in for narrow filters.

**Why:** Vector-only misses keyword precision (speaker names, exact claim phrasing). Text-only misses semantic matches. RRF is the standard 2026 supabase pattern (verified against [Supabase hybrid-search docs](https://supabase.com/docs/guides/ai/hybrid-search)).

```sql
-- packages/core/src/retrieval/hybridSearch.ts (drizzle sql template)
WITH params AS (
  SELECT 60::int AS rrf_k, 1.0::float AS vec_w, 1.0::float AS text_w
),
filtered AS (
  SELECT id, embedding, claim, speaker, domain, risk_flags,
         to_tsvector('english', claim || ' ' || coalesce(rationale, '')) AS fts
  FROM clips
  WHERE status = 'approved'
    AND removed_at IS NULL
    AND ($1::text[] IS NULL OR domain = ANY($1::text[]))           -- domains filter
    AND NOT (risk_flags && $2::text[])                             -- exclude risk_flags
    AND ($3::uuid[] IS NULL OR id <> ALL($3::uuid[]))              -- exclude clip ids (swap)
),
vec_ranked AS (
  SELECT id,
         row_number() OVER (ORDER BY embedding <=> $4::vector) AS rnk_vec,
         1 - (embedding <=> $4::vector) AS sim_vec
  FROM filtered
  ORDER BY embedding <=> $4::vector
  LIMIT 30
),
text_ranked AS (
  SELECT id,
         row_number() OVER (ORDER BY ts_rank(fts, plainto_tsquery('english', $5)) DESC) AS rnk_text
  FROM filtered
  WHERE fts @@ plainto_tsquery('english', $5)
  LIMIT 30
),
fused AS (
  SELECT
    f.id,
    coalesce(1.0 / ((SELECT rrf_k FROM params) + v.rnk_vec), 0) * (SELECT vec_w FROM params) +
    coalesce(1.0 / ((SELECT rrf_k FROM params) + t.rnk_text), 0) * (SELECT text_w FROM params)
      AS rrf_score,
    v.sim_vec
  FROM filtered f
  LEFT JOIN vec_ranked v ON v.id = f.id
  LEFT JOIN text_ranked t ON t.id = f.id
  WHERE v.id IS NOT NULL OR t.id IS NOT NULL
)
SELECT f.*, c.claim, c.speaker, c.domain
FROM fused f
JOIN clips c ON c.id = f.id
ORDER BY rrf_score DESC
LIMIT $6;
```

**pgvector 0.8 iterative scan**: when you combine ANN with filters, enable per-session:

```sql
SET LOCAL hnsw.iterative_scan = strict_order;
SET LOCAL hnsw.max_scan_tuples = 20000;
```

Use `strict_order` for RRF (you need stable ranks). Set this **per-transaction** in the route handler, not globally — it's a knob for filtered queries only.

### Pattern 3: Vercel AI SDK v6 streaming + tool calling

**What:** Server route uses `streamText` with a `fetch_relevant_clips` tool; client uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`. The `UIMessage.parts` array carries text + tool-invocation + tool-result segments — the client renders chip questions by parsing structured tool-output parts.

**Why:** v6 is the current major; `UIMessage.parts` replaces v4/v5's flat `content` string. All examples online for v5 are stale.

```typescript
// apps/web/app/api/interview/route.ts
import { streamText, convertToModelMessages, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { retrieveClips } from '@cited/core/retrieval/retrieveClips';
import { getLlmModelId } from '@cited/core/llm/registry';   // returns 'anthropic/claude-haiku-4.5' etc.
import { getDb } from '@/lib/db';
import { embed } from '@cited/core/llm/registry';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, runId }: { messages: UIMessage[]; runId: string } = await req.json();
  const db = getDb();

  const result = streamText({
    model: getLlmModelId('cheap'),               // resolves to haiku-4.5 / gpt-4o-mini
    system: INTERVIEW_VOICE_SPEC,
    messages: convertToModelMessages(messages),
    tools: {
      fetch_relevant_clips: tool({
        description:
          'Retrieve 3–5 approved DOAC clips relevant to a query within a domain. ' +
          'Use this BEFORE proposing any habit-related question to ground the question in real evidence.',
        inputSchema: z.object({
          query: z.string().describe('A short search phrase capturing the user need'),
          domain: z.enum(['sleep','nutrition_gut','exercise_longevity','mental_health']).optional(),
        }),
        execute: async ({ query, domain }) => {
          const { embeddings } = await embed({ input: [query] });
          const clips = await retrieveClips(
            db,
            embeddings[0],
            query,
            { domains: domain ? [domain] : undefined, excludeRiskFlags: ['medical_advice','supplement','contraindication'] },
            5,
          );
          return { clips };
        },
      }),
    },
    // tools that loop: see "stopWhen" in v6 docs if multi-step tool calling is needed
  });

  return result.toUIMessageStreamResponse();
}
```

```tsx
// apps/web/app/(onboarding)/onboarding/interview/_components/InterviewClient.tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export function InterviewClient({ runId, freeTextOptIn }: { runId: string; freeTextOptIn: boolean }) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/interview', body: { runId } }),
  });

  // The server emits a structured tool-result with chip choices; client parses parts:
  const lastAssistant = messages.filter((m) => m.role === 'assistant').at(-1);
  const choicePart = lastAssistant?.parts.find(
    (p) => p.type === 'tool-fetch_relevant_clips' && p.state === 'output-available',
  );
  // render ChoiceChips component from choicePart.output, etc.

  return (
    /* progress dots + domain badge + choice chips + optional textarea (if freeTextOptIn) */
    null
  );
}
```

### Pattern 4: Citation grounding (post-generation validation)

**What:** Sonnet returns a structured `HabitCandidate[]`. For each candidate, re-fetch every `clip_id` against the live `clips` table, then re-verify the cited claim against the clip's actual claim via cosine similarity (≥0.85 — the same threshold as Phase 2 AION-10 grounding). Drop any citation that fails. If a candidate has <2 valid citations remaining, regenerate that candidate (one retry max — second failure = drop the candidate).

**Why:** Hallucinated clip_ids and paraphrased-but-wrong claims are the two failure modes. Phase 2 already shipped `packages/core/src/llm/grounding/similarityCheck.ts` (`groundingCheck` function with `GROUNDING_THRESHOLD = 0.85`) — **reuse this directly**, do not write a parallel implementation.

```typescript
// packages/core/src/recommendations/validateCitations.ts
import { groundingCheck, GROUNDING_THRESHOLD } from '@cited/core/llm/grounding/similarityCheck';
import { z } from 'zod';

export const CitationSchema = z.object({
  clipId: z.string().uuid(),
  claim: z.string(),       // model-quoted; we re-verify against the live clip
  speaker: z.string(),
});

export type Citation = z.infer<typeof CitationSchema>;

export async function validateCitations(
  citations: Citation[],
  db: Database,
  nearest: NearestChunkQuery,
): Promise<{ valid: Citation[]; dropped: Array<{ citation: Citation; reason: string }> }> {
  const valid: Citation[] = [];
  const dropped: Array<{ citation: Citation; reason: string }> = [];

  for (const c of citations) {
    const row = await db.query.clips.findFirst({
      where: (clips, { eq, and, isNull }) => and(eq(clips.id, c.clipId), isNull(clips.removedAt)),
    });
    if (!row || row.status !== 'approved') {
      dropped.push({ citation: c, reason: 'clip_not_found_or_unapproved' });
      continue;
    }
    const sim = await groundingCheck(nearest, c.claim, c.clipId);
    if (sim < GROUNDING_THRESHOLD) {
      dropped.push({ citation: c, reason: `claim_similarity_${sim.toFixed(2)}_below_threshold` });
      continue;
    }
    valid.push(c);
  }
  return { valid, dropped };
}
```

### Pattern 5: Substantively-different swap

**What:** Pre-compute `cluster_id INT` on `habit_templates` via k-means with k=4 per domain (so each domain has 4 buckets). Recompute weekly via Supabase pg_cron. To find a swap: same domain, **different cluster_id**, AND cosine distance > 0.7 from at least one of the *current habit's clips* (via `habit_template_clips`), AND ≥2 validated citations.

**Why:** "Substantively different" needs an operational definition. Domain alone is too coarse. Cosine > 0.7 alone can return near-duplicates that happen to be lexically dissimilar. Cluster_id from k-means on the clip embedding centroid forces real semantic separation.

```sql
-- Find swap candidates (run inside a server action)
WITH current_clips AS (
  SELECT c.embedding, c.id
  FROM habit_template_clips htc
  JOIN clips c ON c.id = htc.clip_id
  WHERE htc.habit_template_id = $1
),
current_template AS (
  SELECT domain, cluster_id FROM habit_templates WHERE id = $1
)
SELECT ht.id, ht.slug, ht.title, ht.cluster_id,
       min(c.embedding <=> cc.embedding) AS min_cos_distance
FROM habit_templates ht
JOIN habit_template_clips htc ON htc.habit_template_id = ht.id
JOIN clips c ON c.id = htc.clip_id
CROSS JOIN current_clips cc
WHERE ht.domain = (SELECT domain FROM current_template)
  AND ht.cluster_id <> (SELECT cluster_id FROM current_template)
  AND ht.id <> $1
GROUP BY ht.id
HAVING min(c.embedding <=> cc.embedding) > 0.7    -- "0.7 distance" = strong separation
ORDER BY min_cos_distance DESC
LIMIT 3;
```

K-means is run once-per-week (cheap at <100 templates). A simple JS k-means (no extra dep) works at this scale; if you prefer a Postgres-native path, use the `pgvector` `vector_avg` aggregate for centroid updates.

**Fallback when cluster_id is NULL (early in MVP):** `> 0.7` distance alone, ranked by descending distance.

### Pattern 6: OG image via file convention

**What:** `app/h/[slug]/opengraph-image.tsx` exports a default function that returns `ImageResponse`. Next 16 auto-injects the `og:image` meta tag, sizes it, caches it. This **replaces** the `/api/og/h/[slug]` approach in CONTEXT.md D-12 — propose updating the decision (same UX, less code).

```tsx
// apps/web/app/h/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { getHabitTemplate } from '@cited/db/queries';

export const alt = 'Habit backed by Diary of a CEO';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tpl = await getHabitTemplate(slug);
  // Fetch YouTube thumbnail at generation time:
  const ytThumb = `https://i.ytimg.com/vi/${tpl.youtubeVideoId}/maxresdefault.jpg`;

  return new ImageResponse(
    <div style={{ background: '#F4EFE6', /* warm paper */ width: '100%', height: '100%', display: 'flex' }}>
      <img src={ytThumb} width={540} height={304} style={{ objectFit: 'cover' }} />
      <div style={{ padding: 48, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 56, fontFamily: 'Newsreader' }}>{tpl.title}</div>
        <div style={{ fontSize: 24, color: '#5C5D66', marginTop: 16 }}>{tpl.speaker}</div>
      </div>
    </div>,
    { ...size },
  );
}
```

### Pattern 7: Consistency-first dashboard composition

**What:** Each `HabitCard` is a Server Component that receives `consistency` and `streak` props pre-computed. Consistency bar is the *largest* visual element in the card (top half). Streak counter is rendered below with smaller type, and shows `freezesAvailable`. Streaks ≥30 are hidden from the card view (HAB-09) but visible on detail page.

```tsx
// apps/web/app/(app)/dashboard/_components/HabitCard.tsx
export function HabitCard({ habit, consistency, streak }: Props) {
  const hideStreak = streak.currentLength >= 30;     // HAB-09
  return (
    <article>
      {/* PRIMARY — consistency bar 21 cells */}
      <ConsistencyBar checkIns={consistency.last21Days} />     {/* 18/21 label inside */}
      <h3 className="font-newsreader">{habit.title}</h3>
      {/* SECONDARY — smaller */}
      {!hideStreak && (
        <div className="text-sm text-ink-3">
          <span className="font-newsreader">{streak.currentLength}</span> day streak
          {streak.freezesAvailable > 0 && <span>· ❄️ {streak.freezesAvailable}</span>}
        </div>
      )}
      <CheckInTrigger habitId={habit.id} />
    </article>
  );
}
```

Missed days = `paper-3` (muted neutral, per HAB-10 + design tokens). Never red. Never flame.

### Anti-Patterns to Avoid

- **Putting SQL in route handlers** — use `packages/core/src/retrieval/*`. Routes call functions.
- **Direct LLM SDK imports in routes** — AION-09 is enforced by Biome. Always go through `packages/core/src/llm/provider.ts`.
- **Trusting LLM-returned clip IDs without re-fetching** — REC-02 is a hard requirement; the validator is non-skippable. Even one demo with a broken citation kills the pitch.
- **Streaming the synthesis step** — Sonnet structured-output (`generateObject`) is a one-shot, not a stream. Show the "Analyzing your profile..." loader (D-03) while it runs (typically 3–8s). Only the *interview turns* stream.
- **Using AI SDK v5 docs** — they show `messages[].content` strings; v6 uses `messages[].parts[]`. Verify against `ai@6` docs only.
- **Pre-loading `<YouTubeEmbed>` iframes** — the whole reason for lite-embed is the click-to-load facade. Don't autoplay; don't use `params="autoplay=1"`. HAB-05 forbids disabling player chrome.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming chat over HTTP | Custom SSE / fetch readers | `streamText` + `useChat` (AI SDK v6) | Tool calling, abort, partial-message resumption all solved |
| Structured LLM output | JSON.parse + try/catch | `generateObject({ schema: z.object(...) })` | Zod validation, retry-on-malformed built in |
| OG image generation | Custom HTML→image worker | `next/og` `ImageResponse` (file convention) | Edge-cached, sized, auto-tagged |
| Cosine + full-text rank fusion | Custom score-mixing in JS | Single SQL with RRF (Pattern 2) | One round trip; uses indexes |
| Citation similarity check | Re-roll embedding loop | Reuse `groundingCheck` from `packages/core/src/llm/grounding/similarityCheck.ts` (shipped Phase 2) | Already tested, same threshold (0.85) as AION-10 eval |
| K-means in user space | Run on every swap request | Weekly Supabase pg_cron writes `cluster_id`; query reads | Determinism + caching |
| Consistency calc on each render | Inline date-fns calls in render | `packages/core/src/habits/consistency.ts` + cached server query | Testable; reusable for digest emails (Phase 4) |
| Sitemap | Custom XML builder | `app/sitemap.ts` (Next file convention) | Auto-served at `/sitemap.xml` |
| Anonymous-leak test | Mock-based unit test | Real Supabase anon client with RLS + a row owned by another user (Pattern in §RLS Test) | Only real DB proves RLS |

**Key insight:** This phase is mostly *composition* of existing primitives. Resist the urge to write infrastructure. The novelty budget should go to (a) the voice spec for interview turns, (b) the swap algorithm, and (c) UX polish.

## Common Pitfalls

### Pitfall 1: Hallucinated clip_ids (Pitfall 12 from ROADMAP)
**What goes wrong:** Sonnet returns plausible-looking UUIDs that aren't in `clips`. Worse: returns real UUIDs but paraphrases the claim incorrectly.
**Why it happens:** Even with structured outputs, LLMs can fabricate IDs unless they're forced to ground in retrieved evidence.
**How to avoid:** (1) The synthesis prompt receives the *retrieved* clip set as context with explicit IDs, formatted as a fenced JSON block. (2) Tell the model "Only cite clip_ids from this list." (3) Post-validate via `validateCitations`. (4) If `valid.length < 2`, regenerate once. If still <2, drop the candidate.
**Warning signs:** CI grounding eval (AION-10 from Phase 2) shows degradation; user-facing demo shows "404 clip" or a YouTube embed playing audio with no relation to the claim.

### Pitfall 2: AI SDK v5 sample code lookalike
**What goes wrong:** Engineer copies a v5 snippet using `messages[].content` and `experimental_streamText`, code compiles, runtime explodes when v6's `useChat` expects `parts`.
**Why it happens:** Most Stack Overflow / blog content is still v5.
**How to avoid:** **Only reference docs from `ai-sdk.dev` dated 2026.** Every interview/chat code change should verify the `UIMessage.parts` shape. Add a TypeScript type check on the first commit so a v5 shape would fail to compile.
**Warning signs:** Type error on `m.content`; runtime "expected `parts` to be array."

### Pitfall 3: pgvector HNSW with WHERE filter returns <LIMIT rows
**What goes wrong:** Query `WHERE domain='sleep' ORDER BY embedding <=> $1 LIMIT 5` returns only 2 rows because the HNSW search visited 40 candidates and only 2 happened to be in 'sleep'.
**Why it happens:** HNSW is approximate; filtering after the index scan can starve results.
**How to avoid:** Enable `SET LOCAL hnsw.iterative_scan = strict_order` inside the transaction that issues a filtered ANN query. Or filter in a CTE *before* `ORDER BY embedding <=> $1` (the RRF SQL in Pattern 2 already does this).
**Warning signs:** Interview turns return generic clips; specific-domain queries get cross-domain matches; same query returns different counts on different runs.

### Pitfall 4: `<YouTubeEmbed>` regresses in a minor Next bump (experimental package)
**What goes wrong:** `@next/third-parties` ships a breaking change; clip embeds 500 in production.
**Why it happens:** The package is officially "experimental" (verified from Next docs).
**How to avoid:** (1) Pin exact patch version of `@next/third-parties`. (2) Write one Playwright test that mounts a habit card and asserts the iframe `src` contains `start=` and `end=`. (3) Document fallback: a 30-line `LiteYouTubeEmbed.tsx` using `lite-youtube-embed` directly — keep it commented out, ready to swap.
**Warning signs:** Build warnings about `@next/third-parties`; thumbnails not loading; iframe URL missing timestamp params.

### Pitfall 5: Streak loss-frame leaking back into UI
**What goes wrong:** Designer / engineer adds 🔥 emoji, red color for missed days, or makes streak number the largest type — undoing HAB-06..10.
**Why it happens:** Conventional habit-app UI patterns are universally loss-frame. Defaults push you wrong.
**How to avoid:** (1) Linter rule (or visual review): no `text-red-*` classes in `dashboard/`. (2) Streak font size MUST be smaller than consistency bar label. (3) Missed-day cell = `bg-paper-3`, never `bg-red-*`, never `bg-warn`. (4) Snapshot test of `HabitCard` checks no red or flame emoji.
**Warning signs:** PR diff contains `text-red`, `🔥`, `lossStreak`, "broken streak."

### Pitfall 6: Public `/h/[slug]` route leaks user data via JOIN
**What goes wrong:** SSR query for the page accidentally joins `user_habits` (RLS-protected) to surface "X people adopted this," and because the SSR uses a service-role client it bypasses RLS.
**Why it happens:** Public pages are tempting to enrich with engagement signals; the wrong DB client gets used; RLS is silently bypassed by service role.
**How to avoid:** (1) Public route handlers use `@supabase/ssr`'s **anonymous** client, never service-role. (2) Drizzle queries on the public route only touch `habit_templates`, `clips`, `episodes`, `habit_template_clips` (no user-scoped tables). (3) RLS smoke test: fetch `/h/[slug]` as anon; assert response body contains no `user_id`, no email-shaped strings, no `auth.uid()`.
**Warning signs:** Route handler imports `supabaseAdmin`; query JOINs `user_habits`; response includes user-scoped fields.

### Pitfall 7: Synthesis returns a habit in only 1 domain when interview identified 3 gaps
**What goes wrong:** REC-03 violated; recommendations all in one domain.
**Why it happens:** Sonnet optimizes for "best clip evidence" and ignores domain coverage.
**How to avoid:** Synthesis prompt explicitly requires `≥1 candidate per identified-gap domain`; post-gen validator counts domains and rejects + regenerates if missing coverage. Send Sonnet the gap-domain list as a `must_cover_domains` constraint.
**Warning signs:** Eval set checks domain coverage; production candidates all "sleep" when interview flagged "mental_health" as a gap.

### Pitfall 8: Voice drift to clinical / generic
**What goes wrong:** Pitfall 15 — interview reads like WebMD.
**How to avoid:** Voice spec lives in a single file (`packages/core/src/interview/voiceSpec.ts`) with: ≤3 sentences per turn; no emoji; no second-person hectoring; reference a specific speaker by name when citing; avoid medical advice keywords ("should," "must take," "prescribed"); when user mentions a symptom, the model is instructed verbatim: "Suggest the user consult a clinician and continue the conversation." Test this in the AION-10 eval CI.

## Code Examples

### Server-side LLM tier resolution (already partially exists)
```typescript
// packages/core/src/llm/registry.ts (existing — extend)
export function getLlmModelId(tier: LlmTier): string {
  if (tier === 'cheap') return process.env.LLM_MODEL_CHEAP ?? 'anthropic/claude-haiku-4-5';
  return process.env.LLM_MODEL_REASONING ?? 'anthropic/claude-sonnet-4-5';
}
```

### Habit-candidate Zod schema
```typescript
// packages/core/src/interview/schemas.ts
import { z } from 'zod';

export const HabitCandidateSchema = z.object({
  templateSlug: z.string(),                    // existing habit_templates.slug OR a new one
  title: z.string().min(8).max(80),
  rationale: z.string().min(20).max(280),      // shown on card
  domain: z.enum(['sleep','nutrition_gut','exercise_longevity','mental_health']),
  trigger: z.string().min(8),                  // implementation-intention (when/where)
  tinyAction: z.string().min(4).max(80),       // BJ Fogg minimum
  citations: z.array(CitationSchema).min(2).max(3),
});

export const SynthesisOutputSchema = z.object({
  profileSummary: z.object({
    gapDomains: z.array(z.enum(['sleep','nutrition_gut','exercise_longevity','mental_health'])).min(1),
    summaries: z.record(z.string()),            // domain -> one-sentence summary
  }),
  candidates: z.array(HabitCandidateSchema).min(3).max(5),
});
```

### RLS smoke test for `/h/[slug]`
```typescript
// apps/web/__tests__/rls-public-habit.spec.ts (Playwright or integration)
import { createClient } from '@supabase/supabase-js';
test('GET /h/sleep-fixed-bedtime as anon does not expose user data', async () => {
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  // Seed a user habit owned by user A:
  // ... create row in user_habits with userId=A, habit_template slug=sleep-fixed-bedtime ...

  const res = await fetch('http://localhost:3000/h/sleep-fixed-bedtime');
  const html = await res.text();
  expect(html).not.toContain('user_id');
  expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);    // no emails
  // And confirm anon role cannot directly read user_habits:
  const { data, error } = await anon.from('user_habits').select('*').limit(1);
  expect(data).toEqual([]);                                  // RLS denies
});
```

### Streak rollover + freeze auto-apply (server action)
```typescript
// apps/web/app/actions/check-in.ts
'use server';
import { z } from 'zod';

const Input = z.object({
  userHabitId: z.string().uuid(),
  status: z.enum(['done','partial','skipped']),
  mood: z.number().int().min(1).max(5).optional(),
  note: z.string().max(500).optional(),
});

export async function checkInAction(raw: unknown) {
  const input = Input.parse(raw);
  const user = await requireUser();
  const db = getDb();
  // 1. Upsert check_ins (UNIQUE(userHabitId, checkInDate))
  // 2. Recompute streak:
  //    - if status='done' or 'partial': increment streak.currentLength
  //    - if 'skipped' or missed: try auto-apply freeze (HAB-08)
  //      a) count freezes_available = banked - used
  //      b) if used_this_week < 1 AND freezes_available > 0 → consume a freeze, do NOT reset
  //      c) else → reset to 0
  // 3. Check graduation: if streak.currentLength >= 21 AND user_habits.status='active'
  //    → set user_habits.status='graduated' (NOT auto-archived; that requires user accept)
  //    → return { graduated: true, habitId } so client shows graduation toast
  // 4. Respect AUTH-05c: persist `note` only if profiles.consent_free_text_ai = true
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI SDK v5 `messages[].content` | v6 `messages[].parts[]` typed segments | AI SDK v6 (late 2025) | Mandatory rewrite; all v5 examples obsolete |
| Pages Router + `/api/og` route | App Router file-convention `opengraph-image.tsx` | Next 13.3+, refined in 16 | Less code; auto-tagged; cached |
| IVFFlat indexes | HNSW + iterative_scan (0.8+) | pgvector 0.8 (2024-late, stable in 0.8.2) | Recall improvement under filters |
| Vector-only or text-only retrieval | RRF hybrid (vector + tsvector) | Supabase reference pattern | Higher precision on multi-word claims |
| AuthJS / NextAuth v5 | Supabase Auth (this project) / Better Auth (greenfield) | Sept 2025 NextAuth → BetterAuth merger | We stay on Supabase Auth for RLS integration |

**Deprecated/outdated (do not use):**
- `experimental_streamText` — replaced by stable `streamText` in v6
- AI SDK v4 `Message` type — replaced by `UIMessage` (with `parts`) and `ModelMessage` (for `convertToModelMessages`)
- `@supabase/auth-helpers-nextjs` — replaced by `@supabase/ssr` (already in use)
- IVFFlat indexes — use HNSW

## Open Questions

1. **Should the swap UX be a slide-in panel, modal, or its own page?**
   - Locked decision says Claude's discretion. **Recommendation: slide-in panel from the right (Radix Dialog with custom transform).** Keeps user context (current habit card visible), takes ~half-screen, mobile-collapses to fullscreen. Less navigation friction than a dedicated page.

2. **Cluster_id k-means parameters — k per domain, recompute cadence?**
   - **Recommendation: k=4 per domain (16 total clusters), weekly pg_cron, deterministic seed.** With 30–60 templates total at MVP, k=4 per domain gives ~2–4 templates per cluster. Re-evaluate at 100+ templates.

3. **Should OG image use file convention or custom route (D-12 conflict)?**
   - **Recommendation: switch to file convention** (`opengraph-image.tsx`). Less code, idiomatic Next 16, same outcome. Surface this as a small CONTEXT.md amendment to the user before planning locks.

4. **How do we surface "you have an active interview run" if user starts then leaves?**
   - `interview_runs` row has `completedAt nullable`; on dashboard load, if a row exists with `completedAt IS NULL`, show "Resume your interview" banner. **Recommendation: include this in Wave 2 task scope; not blocking.**

5. **What's the noindex policy for supplement-adjacent habit pages (PUB-04 + LGL-08)?**
   - Concrete rule: if any cited clip on a habit_template has `risk_flags @> '{supplement,medical_advice,contraindication}'`, the page emits `<meta name="robots" content="noindex">` and is excluded from `sitemap.ts`. **Recommendation: codify this in `packages/core/src/habits/seoPolicy.ts` and unit-test it.**

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Postgres 17 + pgvector 0.8.2 | All retrieval, swap, grounding | ✓ (via Supabase / compose) | 17.x / 0.8.x | — |
| Supabase Auth + RLS | Public-page leak test, all auth | ✓ | — | — |
| OpenAI API (`OPENAI_API_KEY`) | Embeddings | ✓ (env-gated; verified in Phase 2 work) | — | None — Phase 2 corpus already embedded |
| Anthropic API (`ANTHROPIC_API_KEY`) | Sonnet synthesis | ✓ (env-gated) | — | Switch to OpenAI GPT-5-class via provider wrapper |
| YouTube IFrame / oEmbed | `<YouTubeEmbed>` thumbnail rendering | ✓ (public network) | — | Static placeholder thumbnail if YouTube down |
| `ai` package | All chat + structured outputs | ✗ (NOT INSTALLED) | — | Must install in Wave 1 |
| `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic` | Provider wiring | ✗ (NOT INSTALLED) | — | Must install in Wave 1 |

**Missing dependencies with no fallback:** `ai` SDK + provider adapters — **install in the first plan of Wave 1**.

**Missing dependencies with fallback:** Anthropic key (can swap to OpenAI for synthesis if not available).

## Schema Gaps (Wave 1 must address before any feature code)

| Table | Missing column / table | Why needed | Migration |
|-------|------------------------|------------|-----------|
| `user_habits` | `status` enum (`active`/`archived`/`graduated`), `archivedAt timestamp`, `graduatedAt timestamp` | D-09 graduation, REC-06 history | `ALTER TABLE user_habits ADD COLUMN status user_habit_status NOT NULL DEFAULT 'active'`, plus timestamps |
| `habit_templates` | `cluster_id INT NULL` | SWAP-02 substantively-different | `ALTER TABLE habit_templates ADD COLUMN cluster_id INT` |
| (new) `interview_runs` | id, userId, runIndex, profileJson (jsonb), candidatesJson, startedAt, completedAt | AION-05, REC-06 (multiple runs in history) | New Drizzle schema file |
| `streak_freezes` | (already exists) — needs server-action logic for auto-apply, not schema change | HAB-08 | No migration, logic in `packages/core/src/habits/streak.ts` |
| `clips` / `transcript_chunks` | Confirm HNSW index exists on `embedding`; if not, `CREATE INDEX CONCURRENTLY ON clips USING hnsw (embedding vector_cosine_ops)` | Hybrid retrieval at usable latency | Verify; add if missing |
| `habit_templates` + `clips` | tsvector GIN index for hybrid search: `CREATE INDEX ON clips USING gin (to_tsvector('english', claim))` | Hybrid retrieval text leg | Add migration |

## Plan Slicing Recommendation (for the planner)

This phase has 33 requirements and is the demo-critical end-to-end. Suggested decomposition into **6 plans across 3 waves**:

### Wave 1 — Foundation (parallel-safe)
- **Plan 03-01: Schema additions + retrieval lib + AI SDK wiring**
  Migrations (user_habits.status, cluster_id, interview_runs table, HNSW + GIN indexes), `packages/core/src/retrieval/*`, `packages/core/src/interview/schemas.ts`, install `ai@6` + `@ai-sdk/*`, extend `packages/core/src/llm/*` to use AI SDK providers internally. Reuses Phase 2's `groundingCheck`.
  Requirements: foundation for AION-01..05, REC-01..04, SWAP-02.

### Wave 2 — Interview + Recommendations (sequential after Wave 1)
- **Plan 03-02: Interview API + state machine + voice spec**
  `app/api/interview/route.ts` with `streamText` + `fetch_relevant_clips` tool. `packages/core/src/interview/{stateMachine,voiceSpec,tools}.ts`. Persists turns to `interview_runs`.
  Requirements: AION-01, AION-02, AION-03, AION-04, AION-06, AION-07, AION-08.
- **Plan 03-03: Synthesis + citation validation + recommendation generation**
  `app/api/synthesize/route.ts` (Sonnet `generateObject`), `validateCitations`, regenerate-on-fail policy. "Tell me more" textarea integration.
  Requirements: AION-05, REC-01, REC-02, REC-03, REC-04.
- **Plan 03-04: Onboarding UI (interview + swipe stack + "tell me more")**
  Client components: `InterviewClient`, `ProgressDots`, `ChoiceChips`, `SynthesisLoader`, `TellMeMore`, `RecommendationStack` with swipe + confetti. Server Action `adopt-habit.ts`.
  Requirements: REC-05, REC-06 (settings re-run button), AION-01 UX surface.

### Wave 3 — Dashboard + Detail + Public + Swap (mostly parallel-safe after Wave 2)
- **Plan 03-05: Dashboard + tri-state check-in + streak/freeze/graduation**
  `(app)/dashboard/`, `HabitCard` with consistency PRIMARY, `CheckInSheet` bottom sheet, server actions for check-in + archive. Streak rollover + freeze auto-apply + graduation predicate + toast.
  Requirements: HAB-01 through HAB-10 (all 10 dashboard reqs).
- **Plan 03-06: Habit detail + public page + OG image + sitemap + RLS test + swap + DMCA carry-over**
  `app/(app)/habits/[id]/page.tsx` + swap panel + `app/h/[slug]/{page,opengraph-image}.tsx` + `app/sitemap.ts` + `app/robots.ts` + RLS Playwright test + `seoPolicy.ts` noindex rules. Includes carry-over LGL DMCA visibility check now that `/h/*` is public.
  Requirements: HAB-04 (detail), HAB-05 (no chrome disabled), SWAP-01..04, PUB-01..05.

**Wave dependency graph:**
```
Wave 1 (03-01)
   ↓
Wave 2: 03-02 → 03-03 → 03-04
                       ↓
Wave 3: 03-05  ||  03-06   (both depend on schema; can run parallel)
```

**Recommended approach:** plan all 6 PLAN.md files up front so dependencies are explicit; execute Wave 1 fully, then Wave 2 in order, then Wave 3 in parallel.

## Sources

### Primary (HIGH confidence)
- [Next.js 16.2 `opengraph-image` API reference (dated 2026-05-13)](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) — file convention, `ImageResponse`, async `params` Promise
- [Next.js 16.2 third-party libraries / `<YouTubeEmbed>` docs (dated 2026-05-13)](https://nextjs.org/docs/app/guides/third-party-libraries) — `params="controls=0&start=10&end=30"` syntax, package marked **experimental**
- [Vercel AI SDK v6 chatbot docs (`ai-sdk.dev`)](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) — `UIMessage.parts`, `useChat`, `DefaultChatTransport`, `convertToModelMessages`, `toUIMessageStreamResponse()`
- [Vercel AI SDK v6 tools-and-tool-calling docs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) — `tool({ inputSchema, execute })` pattern
- [Supabase hybrid-search docs](https://supabase.com/docs/guides/ai/hybrid-search) — RRF formula `1/(k + rank)`, separate GIN + HNSW indexes
- [pgvector GitHub (0.8 iterative scan)](https://github.com/pgvector/pgvector) — `hnsw.iterative_scan`, `max_scan_tuples`, why filtered ANN starves without it
- npm registry version verifications (2026-05-13): `ai@6.0.180`, `next@16.2.6`, `@next/third-parties@16.2.6`, `drizzle-orm@0.45.2`, `pgvector@0.2.1`
- Existing project code: `packages/core/src/llm/grounding/similarityCheck.ts` (`groundingCheck`, threshold 0.85) — reusable; `packages/core/src/llm/{types,provider,registry}.ts` (LlmTier wiring); `packages/db/src/schema/*` (current schema review)
- `.planning/UI-DESIGN.md` — palette tokens, typography scale, habit card modes
- `.planning/REQUIREMENTS.md` §AION/REC/HAB/SWAP/PUB — verbatim requirement text
- `.planning/ROADMAP.md` Phase 3 — pitfall coverage

### Secondary (MEDIUM confidence)
- Supabase RLS testing patterns — community references rather than first-party canonical pgTAP test files. Pattern given is "real anon Supabase client + assert empty result," verified by general RLS docs but exact test scaffold is judgment-call from prior patterns in the repo.

### Tertiary (LOW confidence)
- K-means k=4 per domain — chosen by reasoning about template count at MVP (16 clusters / ≥30 templates ≈ 2 per cluster). No external benchmark; flag for validation after corpus grows past 100 templates.

## Project Constraints (from CLAUDE.md)

The following directives in `./CLAUDE.md` constrain this phase and were honored in this research:

- **Provider wrapper enforcement (AION-09):** All LLM calls go through `packages/core/src/llm/provider.ts` — Biome-enforced. Research recommends adapting the AI SDK *inside* the wrapper, not in routes.
- **Stack lock-in:** Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + Supabase Auth + Drizzle 0.36+ + pgvector 0.8.2 + OpenAI `text-embedding-3-small` + Claude Sonnet/Haiku + GPT-4o-mini + `<YouTubeEmbed>` (lite-embed) — research stays inside this stack. (Minor drift: CLAUDE.md says AI SDK 5.x; verified registry has v6 stable — calling out as a version bump for the planner to ratify.)
- **Three-layer legal posture:** Right-of-publicity attribution on every public habit page; "Watch on Diary of a CEO" CTA preserves YouTube ToS factor; clip length is curator-set, no client-side cap (HAB-04).
- **Streak demoted, consistency primary:** Honored in HabitCard pattern and Pitfall 5.
- **GDPR Article 9 granular consent (AUTH-05c):** Free-text gating enforced in interview and check-in note storage.
- **No clip length cap:** Reflected — research never proposes clipping.
- **UI design system:** Tokens cited (paper, paper-2, paper-3, ink, accent), typography (Newsreader / Geist Sans / Geist Mono), `<YouTubeEmbed>` usage rule.
- **GSD Workflow Enforcement:** This research file was produced under `/gsd:research-phase`.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions verified against npm registry on 2026-05-13; Next 16.2 + AI SDK v6 + pgvector 0.8 docs read directly.
- Architecture patterns: **HIGH** — RRF, file-convention OG, AI SDK v6 `UIMessage.parts` all sourced from current first-party docs.
- Schema gaps: **HIGH** — verified by direct file reads of `packages/db/src/schema/*`.
- Cluster algorithm: **MEDIUM** — k=4-per-domain is a reasoned choice, not benchmark-backed; OK to ship MVP and iterate.
- Voice spec details: **MEDIUM** — heuristics; relies on Phase 2 AION-10 eval for objective regression check.
- RLS test scaffold: **MEDIUM** — pattern is correct in principle; first concrete implementation in this codebase happens in Plan 03-06.

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (30 days; AI SDK and Next.js move fast — re-verify versions before Phase 4 if planning slips)

---

## RESEARCH COMPLETE

**Phase:** 3 — User AI Loop (the Demo)
**Confidence:** HIGH on stack + architecture; MEDIUM on swap-cluster algorithm and voice prompt specifics (both are judgment calls codifiable in code review)

### Key Findings

- **AI SDK v6** is current (registry-verified `ai@6.0.180`). CLAUDE.md references v5 — propose a minor doc update. All chat code must use `UIMessage.parts`, `convertToModelMessages`, `DefaultChatTransport`.
- **Schema gaps are blocking**: `user_habits.status`/`archivedAt`, `habit_templates.cluster_id`, and a new `interview_runs` table must land in Wave 1 before any feature code. HNSW + GIN indexes need verification.
- **Reuse Phase 2's `groundingCheck`** (`packages/core/src/llm/grounding/similarityCheck.ts`, threshold 0.85) for REC-02 citation validation — do not write a parallel implementation.
- **OG image: switch to file convention** (`app/h/[slug]/opengraph-image.tsx`) instead of D-12's `/api/og/h/[slug]` route handler — same UX, idiomatic Next 16. Surface as small CONTEXT amendment.
- **Cluster_id for SWAP-02**: pre-compute weekly via pg_cron (k=4 per domain via k-means), fallback to `cosine > 0.7` alone when null.
- **Hybrid retrieval pattern**: single SQL with CTEs (filter → vec_rank → text_rank → RRF) per Supabase canonical pattern; enable `hnsw.iterative_scan = strict_order` per transaction.
- **`<YouTubeEmbed>` is officially experimental** — pin version, add Playwright smoke test, document raw `lite-youtube-embed` fallback.

### File Created
`/home/king/Hdiary/.planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All versions verified via npm view 2026-05-13; first-party docs read |
| Architecture | HIGH | RRF, file-convention OG, AI SDK v6 patterns all sourced from 2026-dated first-party docs |
| Pitfalls | HIGH | Combine training data + verified failure modes from docs (HNSW filter starvation, v5→v6 API change, experimental package risk) |
| Schema gap analysis | HIGH | Direct read of `packages/db/src/schema/*` |
| Swap cluster algorithm | MEDIUM | k=4-per-domain is reasoned, not benchmark-backed |
| RLS test scaffold | MEDIUM | Correct in principle; first concrete impl in Plan 03-06 |

### Open Questions
1. Swap UX (slide-panel vs. modal vs. page) — researcher recommends slide-in panel; Claude's discretion per D-10.
2. CONTEXT.md D-12 OG image route — recommend amending to file convention.
3. noindex rule for supplement clips — codify in `packages/core/src/habits/seoPolicy.ts`.

### Ready for Planning
Plan 03-01..03-06 outlined under "Plan Slicing Recommendation"; planner can now create PLAN.md files.
