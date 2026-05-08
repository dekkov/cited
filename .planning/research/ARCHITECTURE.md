# Architecture Research

**Domain:** OSS evidence-backed habit tracker with podcast-clip RAG (Hdiary)
**Researched:** 2026-05-07
**Confidence:** HIGH for Next.js + Supabase + Drizzle patterns; MEDIUM for the Phase 2 worker integration shape (chosen for forward-compat, not yet exercised)

## Standard Architecture

### System Overview (MVP / Phase 1)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser (User + Curator)                      │
│  ┌──────────────────────────┐    ┌──────────────────────────────┐    │
│  │  apps/web (user PWA-ish) │    │  apps/admin (curator tool)   │    │
│  │  - onboarding interview  │    │  - clip CRUD + approve       │    │
│  │  - habit cards / checkin │    │  - speaker / domain mgmt     │    │
│  │  - public /h/[slug]      │    │  - moderation queue (stub)   │    │
│  │  - YouTube IFrame embeds │    │                              │    │
│  └────────────┬─────────────┘    └─────────────┬────────────────┘    │
└───────────────┼────────────────────────────────┼─────────────────────┘
                │ Server Actions / RSC fetch     │ Server Actions
                ▼                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                Next.js 15 Server (Vercel — App Router)                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Route Handlers  (machines: webhooks, cron, public JSON, oauth)│  │
│  │  Server Actions  (humans: forms, check-ins, swap, approve)     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Service Layer  (packages/core — pure TS)          │  │
│  │  interview.service / habit.service / clip.service / rag.service│  │
│  │  embedding.service / swap.service                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Data Layer  (packages/db — Drizzle)               │  │
│  │  schema.ts / queries/*.ts / migrations/                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────┬──────────────────────┘
             │ pg (postgres-js)                 │ HTTPS
             ▼                                  ▼
┌────────────────────────────────┐   ┌─────────────────────────────────┐
│   Supabase Postgres            │   │   External APIs                 │
│   - Auth (RLS-aware JWTs)      │   │   - OpenAI embeddings (3-small) │
│   - pgvector (HNSW cosine)     │   │   - Anthropic Claude (interview)│
│   - tsvector hybrid search     │   │   - YouTube IFrame (browser)    │
│   - row-level security         │   │   - (Phase 2) Hetzner worker    │
└────────────────────────────────┘   └─────────────────────────────────┘
```

### System Overview (Phase 2 Extension — AI Worker Lands)

```
                        ┌────────────────────────────┐
                        │  apps/worker (Python)      │
                        │  FastAPI + faster-whisper  │
                        │  + pyannote + Claude       │
                        │  Hetzner CX22 (~€4/mo)     │
                        └──────────┬─────────────────┘
                                   │ pulls jobs
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Supabase Postgres                                                    │
│  - extraction_jobs table (queue)                                      │
│  - clips_pending (proposed by worker, awaits curator approval)        │
│  - same schema as Phase 1 — no breaking change                        │
└──────────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ writes proposed clips
                                   │ admin reviews via apps/admin
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **apps/web** | End-user app: auth, onboarding interview, habit cards, daily check-in, swap, public habit pages | Next.js 15 App Router (RSC by default, client islands for interview chat + check-in widgets) |
| **apps/admin** | Single-curator tool to create/approve clips, manage speakers/domains, eyeball pgvector matches | Next.js 15 App Router on a separate subdomain; gated via `profiles.role = 'curator'` + middleware |
| **apps/worker** (Phase 2 stub) | Long-running Python jobs: transcribe DOAC episodes, diarize, propose claim/clip windows | FastAPI + faster-whisper + pyannote; pulls jobs from `extraction_jobs` table |
| **packages/db** | Drizzle schema, migrations, query helpers, RLS policy SQL | `drizzle-orm/pg-core` + `drizzle-kit` migrations; co-located RLS policies as SQL files |
| **packages/core** | Domain services and use-cases (RAG, embedding, interview orchestration, swap logic) | Pure TS, no Next.js/React imports — importable by web, admin, and (theoretically) worker callbacks |
| **packages/ui** | shadcn/ui primitives + branded components (HabitCard, ClipPlayer, EvidenceBadge) | React 19, Tailwind v4, no app-specific business logic |
| **packages/config** | Shared eslint/tsconfig/tailwind preset, env schema (zod) | Standard Turborepo internal package |

**Boundary rule:** `packages/core` may import `packages/db`, but `packages/db` must not import from `core`. Apps depend on `core`, not directly on `db`, except where Drizzle's SQL composition is needed (RAG queries) and is exposed through a `core` service.

## Recommended Project Structure

```
hdiary/
├── apps/
│   ├── web/                        # End-user Next.js 15 app
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── auth/callback/route.ts    # Supabase OAuth callback
│   │   │   ├── (app)/                         # Authenticated layout
│   │   │   │   ├── onboarding/
│   │   │   │   │   ├── page.tsx              # Interview UI (Client Component island)
│   │   │   │   │   └── actions.ts            # Server Actions: nextTurn, finalize
│   │   │   │   ├── habits/
│   │   │   │   │   ├── page.tsx              # Habit dashboard (RSC)
│   │   │   │   │   ├── [id]/page.tsx
│   │   │   │   │   └── actions.ts            # checkIn, requestSwap
│   │   │   │   └── settings/
│   │   │   ├── h/[slug]/page.tsx             # Public, SEO-friendly habit page
│   │   │   ├── api/
│   │   │   │   ├── og/[slug]/route.ts        # OG image generation
│   │   │   │   ├── export/route.ts           # GDPR export (machine endpoint)
│   │   │   │   └── webhooks/
│   │   │   │       └── stripe/route.ts       # (future)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx                      # Marketing landing
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── server.ts                 # createServerClient (cookies)
│   │   │   │   └── client.ts                 # createBrowserClient
│   │   │   └── auth.ts                       # getCurrentUser() helper
│   │   └── middleware.ts                     # Refresh Supabase session
│   ├── admin/                                # Curator Next.js app
│   │   ├── app/
│   │   │   ├── (curator)/
│   │   │   │   ├── clips/                    # CRUD + approve queue
│   │   │   │   ├── templates/                # habit_templates editor
│   │   │   │   └── speakers/
│   │   │   └── layout.tsx                    # Role-guard middleware
│   │   └── middleware.ts                     # require role = 'curator'
│   └── worker/                               # PHASE 2 — stub at MVP
│       ├── README.md                         # "Deferred to v0.5; see ROADMAP"
│       └── pyproject.toml                    # Empty placeholder, keeps path stable
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── auth.ts                   # profiles (mirrors auth.users)
│   │   │   │   ├── content.ts                # podcasts, episodes, speakers, clips
│   │   │   │   ├── habits.ts                 # habit_templates, habit_template_clips, user_habits
│   │   │   │   ├── tracking.ts               # check_ins, streaks
│   │   │   │   └── jobs.ts                   # extraction_jobs (Phase 2; safe to add now)
│   │   │   ├── queries/                      # Reusable SQL fragments
│   │   │   │   ├── rag.ts                    # cosineDistance + tsvector hybrid
│   │   │   │   └── streaks.ts
│   │   │   ├── client.ts                     # drizzle({ schema }) factory
│   │   │   └── index.ts
│   │   ├── migrations/                       # drizzle-kit output
│   │   ├── policies/                         # *.sql RLS policy files
│   │   └── drizzle.config.ts
│   ├── core/
│   │   ├── src/
│   │   │   ├── interview/
│   │   │   │   ├── orchestrator.ts           # Turn-by-turn LLM loop
│   │   │   │   ├── prompts.ts
│   │   │   │   └── schema.ts                 # zod: turn input/output
│   │   │   ├── rag/
│   │   │   │   ├── embed.ts                  # OpenAI embedding wrapper
│   │   │   │   ├── search.ts                 # hybrid vector + tsvector
│   │   │   │   └── rerank.ts                 # diversity / domain filter
│   │   │   ├── habits/
│   │   │   │   ├── recommend.ts
│   │   │   │   ├── checkin.ts
│   │   │   │   └── swap.ts
│   │   │   ├── clips/
│   │   │   │   └── publish.ts                # Approve → embed → set is_published
│   │   │   └── llm/
│   │   │       ├── claude.ts                 # Anthropic SDK wrapper
│   │   │       └── openai.ts                 # Embeddings only at MVP
│   │   └── package.json
│   ├── ui/                                   # shadcn/ui + HabitCard, ClipPlayer
│   ├── config/                               # eslint, tsconfig, tailwind, env zod
│   └── api-contracts/                        # SHARED zod schemas (web ↔ worker)
│       └── src/
│           ├── extraction-job.ts             # Worker contract — set up at MVP, exercised Phase 2
│           └── clip-proposal.ts
├── docs/                                     # Astro Starlight (Phase 1 lite)
├── docker-compose.yml                        # Self-host path
├── turbo.json
└── pnpm-workspace.yaml
```

### Structure Rationale

- **Two apps not one:** `apps/admin` is a separate Next.js app on its own subdomain so the user bundle never ships curator code, RLS errors are unambiguous, and the admin app can later add heavier tools (queue dashboards, batch import) without polluting `apps/web`.
- **`packages/core` is the seam:** All RAG, interview, swap, recommendation logic lives in pure TS, so Server Actions stay thin (validate → call service → revalidate) and the same code is unit-testable without spinning up Next.
- **`packages/api-contracts` exists at MVP even though worker is deferred:** Cost is ~5 zod schemas. Benefit: when Phase 2 worker arrives, the Python side just needs equivalent Pydantic models matching the same JSON shape — zero web-side rewrites.
- **`apps/worker/` directory exists as a stub** so the monorepo path is stable; the PROJECT.md commitment to that path is honored without the Python toolchain at MVP.
- **`packages/db/policies/*.sql`** keep RLS policies version-controlled alongside schema, applied via migrations. RLS is non-negotiable for multi-tenant Supabase.

## Architectural Patterns

### Pattern 1: Server Actions for Humans, Route Handlers for Machines

**What:** Use Next.js Server Actions for everything triggered by user interaction in the UI. Use Route Handlers (`route.ts`) only for machine-to-machine: webhooks, cron callbacks, OAuth callbacks, public JSON, GDPR export.

**When to use:** This is the canonical Next.js 15+ guidance. Server Actions give type-safe form binding, automatic CSRF, `revalidatePath`/`revalidateTag` integration, and progressive enhancement.

**Trade-offs:** Server Actions are not directly callable from external systems (no stable URL), so anything the Phase 2 Python worker calls back into must be a Route Handler.

**Example (check-in Server Action):**
```typescript
// apps/web/app/(app)/habits/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { checkInHabit } from '@hdiary/core/habits';
import { getCurrentUser } from '@/lib/auth';

const Input = z.object({
  habitId: z.string().uuid(),
  status: z.enum(['done', 'skipped', 'partial']),
});

export async function checkInAction(formData: FormData) {
  const user = await getCurrentUser();
  const input = Input.parse(Object.fromEntries(formData));
  await checkInHabit({ userId: user.id, ...input });
  revalidatePath('/habits');
}
```

### Pattern 2: RAG Lives in a Service, Not in a Route Handler

**What:** Hybrid retrieval (pgvector cosine + tsvector full-text) is encapsulated in `packages/core/rag/search.ts`. Server Actions and Route Handlers only call `searchClips({ query, domain, k })`.

**When to use:** Always — RAG logic mixed into route files becomes untestable and drifts between user app and admin app.

**Trade-offs:** One extra layer; pays back as soon as you need to call retrieval from the interview orchestrator AND the swap service AND the admin "preview matches" tool.

**Example (Drizzle hybrid search):**
```typescript
// packages/core/src/rag/search.ts
import { sql, and, eq, gt, desc } from 'drizzle-orm';
import { cosineDistance } from 'drizzle-orm';
import { db } from '@hdiary/db';
import { clips } from '@hdiary/db/schema';
import { embed } from './embed';

export async function searchClips(args: {
  query: string;
  domain?: string;
  k?: number;
  minSimilarity?: number;
}) {
  const queryEmbedding = await embed(args.query);
  const similarity = sql<number>`1 - (${cosineDistance(clips.embedding, queryEmbedding)})`;
  const tsRank = sql<number>`ts_rank(${clips.searchVector}, plainto_tsquery('english', ${args.query}))`;
  // Hybrid: weighted blend, filter by domain + published, threshold cosine.
  const hybrid = sql<number>`(${similarity} * 0.7) + (${tsRank} * 0.3)`;

  return db
    .select({ clip: clips, similarity, hybrid })
    .from(clips)
    .where(
      and(
        eq(clips.isPublished, true),
        args.domain ? eq(clips.domain, args.domain) : undefined,
        gt(similarity, args.minSimilarity ?? 0.7),
      ),
    )
    .orderBy(desc(hybrid))
    .limit(args.k ?? 8);
}
```

**Performance note (verified):** When using `1 - cosineDistance(...)` in `WHERE`/`ORDER BY`, Postgres may not pick the HNSW index built on `vector_cosine_ops`. Order by `cosineDistance(...)` ASC (raw distance) and apply the `1 -` transform only in the SELECT projection if you see slow plans.

### Pattern 3: Embed-on-Approve, Not Embed-on-Read

**What:** When a curator clicks "Approve" in `apps/admin`, the Server Action calls `clip.publish()`, which: (1) generates the embedding from `claim + speaker_summary + clip_transcript_excerpt`, (2) writes `embedding` and `searchVector` (Postgres-generated tsvector), (3) flips `is_published = true`. Reads never embed.

**When to use:** Always for curated content. Re-embeddings are explicit (`reembedClip(id)`).

**Trade-offs:** Approve action takes ~500–1500ms (one OpenAI call). Acceptable for a single-curator workflow; would not scale to crowd curation without queueing.

### Pattern 4: Habit Template ≠ User Habit (Type-Level Separation)

**What:** `habit_templates` is the curated catalog (1 row per recommended habit). `user_habits` is the per-user instance with cadence, time-of-day, and adoption metadata. They share IDs through a foreign key, but they are different tables, different services, different RLS policies.

**Why this matters:** Conflating them is the most common rewrite-causing mistake in habit trackers (see PITFALLS.md). RLS for `habit_templates` is "public read where published"; RLS for `user_habits` is "owner only." Separation makes both trivial.

### Pattern 5: Worker Integration via Job Table (Not Webhooks)

**What:** When the Python worker arrives in Phase 2, it polls/listens to an `extraction_jobs` table in the same Postgres. The Next.js app inserts jobs (e.g., "transcribe episode X"); the worker claims rows via `SELECT ... FOR UPDATE SKIP LOCKED`, processes, writes proposed clips into `clips_pending`, and updates job status. The curator reviews proposals in `apps/admin`.

**Why this over webhooks:** No public worker endpoint needed (Hetzner box stays firewalled), no shared secret rotation, atomic with the same DB transaction, survives worker restarts. `LISTEN/NOTIFY` can be added later for low-latency signaling.

**Why include the schema at MVP:** The `extraction_jobs` and `clips_pending` tables can be added in Phase 1 migrations as empty placeholders. Cost: ~30 lines of schema. Benefit: zero schema migration risk in Phase 2.

### Pattern 6: RLS-First Auth, Not App-Layer Authz

**What:** Every Supabase table has RLS policies expressed in SQL. The Drizzle client uses the user's JWT (via `createServerClient` cookie-bound session), so the database enforces "users see only their data." App code does not write `WHERE user_id = ?` — RLS does.

**Trade-offs:** RLS is invisible at the Drizzle type level — easy to forget a policy and end up with "no rows" errors that look like bugs. Mitigation: every new table gets a policy file at the same time as the schema file (enforced by a CI check or pre-commit hook).

## Data Flow

### Flow A: Onboarding Interview (Phase 1)

```
User opens /onboarding
   ↓
[apps/web] Client component renders chat shell
   ↓ Server Action: nextTurn(history, userMessage)
[apps/web] actions.ts validates with zod
   ↓
[packages/core] interview.orchestrator.nextTurn()
   ├─→ rag.search.searchClips({ query: userMessage, domain: inferredDomain })
   │       ↓
   │   [packages/core] embed.embed(userMessage)  → OpenAI
   │       ↓
   │   [packages/db] hybrid SQL → Supabase Postgres (HNSW + tsvector)
   │       ↓
   │   returns top-K clips (claim, speaker, video_id, start/end)
   │
   ├─→ llm.claude.complete({ prompt: assemblePrompt(history, retrievedClips) })
   │       ↓                         → Anthropic API
   │   returns next question OR final habit recommendations
   │
   └─→ if final: write profile_summary + recommendations to interview_sessions
   ↓ revalidatePath('/onboarding')
[apps/web] Client component re-renders with new turn / final card
```

### Flow B: Daily Check-in

```
User clicks "Done" on HabitCard
   ↓ Server Action: checkInAction
[packages/core] habits.checkin.checkInHabit()
   ↓
[packages/db] INSERT INTO check_ins  (RLS: owner only)
   ↓ trigger or service call
[packages/core] habits.streak.recompute(userId, habitId)
   ↓
[packages/db] UPSERT streaks
   ↓ revalidatePath('/habits')
```

### Flow C: Clip Curation (Admin)

```
Curator pastes YouTube URL + claim + start/end into admin form
   ↓ Server Action: createClipDraft
[packages/db] INSERT INTO clips (is_published = false, embedding = NULL)
   ↓
Curator clicks "Approve"
   ↓ Server Action: publishClip(id)
[packages/core] clips.publish.publish(id)
   ├─→ embed.embed(claim + transcript_excerpt)  → OpenAI
   ├─→ UPDATE clips SET embedding = ..., is_published = true
   └─→ revalidateTag('clips')
```

### Flow D: Habit Swap

```
User clicks "Swap" with reason
   ↓ Server Action: requestSwap(habitId, reason)
[packages/core] habits.swap.proposeAlternative()
   ├─→ fetch current habit_template (domain, claim_embedding)
   ├─→ rag.search.searchClips({
   │       query: reason || originalClaim,
   │       domain: sameDomain,
   │       excludeIds: [currentClipIds],
   │       diversityFilter: clusterAwayFrom(currentEmbedding)
   │   })
   ├─→ llm.claude generates alternative habit text grounded in retrieved clip
   └─→ returns proposal (user accepts/rejects in next action)
```

### Flow E: Phase 2 Worker (Future)

```
Curator triggers "Process Episode E5" in admin
   ↓ Server Action
[packages/db] INSERT INTO extraction_jobs (episode_id, status='pending')
   ↓
[apps/worker — Hetzner] poll loop
   SELECT * FROM extraction_jobs WHERE status='pending' FOR UPDATE SKIP LOCKED LIMIT 1
   ↓ download YT audio (deletes after) → faster-whisper → pyannote → Claude claim extract
[apps/worker] INSERT INTO clips_pending (episode_id, claim, start_s, end_s, ...)
   ↓ UPDATE extraction_jobs SET status='complete'
[apps/admin] curator reviews clips_pending → "Approve" promotes to clips
```

### State Management

Server-first. RSC reads from DB on render. Mutations go through Server Actions and bust caches via `revalidatePath` / `revalidateTag`. Client state is local-only (interview transcript buffer, optimistic check-in toggle) — Zustand or `useReducer` for the interview chat island; nothing global.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users (MVP, alpha) | Single Vercel project per app + Supabase free tier. HNSW index on `clips.embedding`. No queue. |
| 1k–10k users (post-DOAC pitch) | Supabase paid tier ($25/mo). Add Inngest or Supabase pg_cron for streak recomputation off-request. Hetzner worker live for extraction. |
| 10k–100k users | Move embeddings to a dedicated read-replica or partition `clips` if catalog grows past ~50k rows. Cache hot RAG queries in Vercel KV. Consider Supabase Branching for migrations. |
| 100k+ users | Likely irrelevant for this OSS project's success metric (stars/contributors), but: split `apps/web` and `apps/admin` Postgres roles, move LLM calls behind a queue, CDN-cache `/h/[slug]` aggressively. |

### Scaling Priorities

1. **First bottleneck: LLM token cost during interview.** Cache prompt prefixes, use Claude Haiku for non-final turns, throttle anonymous users.
2. **Second bottleneck: pgvector recall on a small corpus.** With 30–500 clips, HNSW is overkill but free; once past ~5k clips, tune `ef_search` and verify the planner uses the index.
3. **Third bottleneck: streak recomputation on each check-in.** Move to a deferred job once write traffic exceeds a few QPS.

## Anti-Patterns

### Anti-Pattern 1: Embedding on Every Search Read

**What people do:** Compute clip embeddings lazily inside the search query.
**Why it's wrong:** Massive read amplification, OpenAI bill explodes, search latency dominated by network.
**Do this instead:** Embed at write-time (Pattern 3). Store the vector. Reads are pure SQL.

### Anti-Pattern 2: One Giant `habits` Table

**What people do:** Single `habits` table with both "curated catalog" and "user instance" rows distinguished by a `user_id IS NULL` sentinel.
**Why it's wrong:** RLS becomes a nightmare ("public read where user_id is null OR user_id = auth.uid()"), foreign keys lie, query plans degrade.
**Do this instead:** Separate `habit_templates` and `user_habits` (Pattern 4).

### Anti-Pattern 3: Putting Business Logic in Server Actions

**What people do:** 200-line Server Action that calls OpenAI, queries DB, formats output, all inline in `actions.ts`.
**Why it's wrong:** Untestable without spinning up Next.js. Duplicated when the same logic is needed from admin or a Route Handler.
**Do this instead:** Server Actions are 5–15 lines: auth check, zod validate, call `packages/core` service, revalidate. All logic in core.

### Anti-Pattern 4: Treating RLS as Optional

**What people do:** "I'll just filter by `user_id` in Drizzle." No RLS policies.
**Why it's wrong:** One missed `WHERE` and any user reads any other user's data. Supabase keys leak more than people think.
**Do this instead:** RLS on every user-scoped table from day one. App code never filters by `user_id` for ownership — RLS does. App `WHERE` clauses are for query selectivity only.

### Anti-Pattern 5: Direct Worker → Web App HTTP Callbacks (When Worker Lands)

**What people do:** Python worker POSTs results to a Next.js Route Handler with a shared secret.
**Why it's wrong:** Public callback URL, secret rotation pain, retries become app's problem, worker restart loses in-flight work.
**Do this instead:** Worker writes proposed clips directly to Postgres (Pattern 5). Web app polls or uses Supabase realtime to surface them in admin.

### Anti-Pattern 6: Storing YouTube Video Bytes

**What people do:** Cache audio/video for "performance" or transcription.
**Why it's wrong:** PROJECT.md constraint: deep-link only, never re-host. Legal posture is the entire DOAC pitch.
**Do this instead:** Worker downloads to a tmpfs, transcribes, deletes. Only transcripts (private) and timestamps (public metadata) persist.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `@supabase/ssr` + cookie-bound session, refreshed in `middleware.ts` | One client per request on server; one singleton in browser. Never use service-role key in app code — only in admin Server Actions or migrations. |
| Supabase Postgres | Drizzle via `postgres-js` driver, RLS enforced via JWT-bearing connection | Keep two connections: anon (RLS-on, request-scoped) and service-role (RLS-bypass, admin-only flows like cron, GDPR delete cascade). |
| OpenAI Embeddings | `text-embedding-3-small`, called only at write-time (clip approve, interview message) | Wrap in `packages/core/llm/openai.ts` so swap to local `bge-small` in v2 is a one-file change. |
| Anthropic Claude | Streaming for interview turns; non-streaming for swap proposals | Wrap in `packages/core/llm/claude.ts`. Use Sonnet for final habit recommendations, Haiku for adaptive turns. |
| YouTube IFrame Player API | Browser-only, loaded in `ClipPlayer` Client Component | Never proxy. Use start/end params + IFrame postMessage events to enforce ≤90s window. |
| Vercel | Hosts both `apps/web` and `apps/admin` as separate projects | Different env vars per project. Admin gets stricter `X-Robots-Tag: noindex`. |
| Hetzner CX22 (Phase 2) | SSH-only access, polls Postgres | No inbound HTTP from public internet. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `apps/web` ↔ `packages/core` | Direct TS import | Server Actions and RSC compose services from core. |
| `apps/admin` ↔ `packages/core` | Direct TS import | Same services as web (e.g., `clip.publish`), called from admin contexts. |
| `packages/core` ↔ `packages/db` | Direct Drizzle queries | Core composes SQL via Drizzle; never raw `pg.Pool`. |
| `apps/web` ↔ `apps/admin` | None (separate apps, separate origins) | Communication is via shared DB only. |
| `apps/worker` (Phase 2) ↔ web/admin | Postgres only — `extraction_jobs`, `clips_pending` | No HTTP. Shared schemas in `packages/api-contracts` (zod ↔ Pydantic mirror). |

## Build Order Implications for Roadmap

The architecture implies a strict dependency order for phases:

1. **Phase 1a — Foundation must come first:**
   - `packages/db` schema (incl. `extraction_jobs` placeholder) → `packages/core/llm` wrappers → `apps/web` auth shell → `apps/admin` auth shell.
   - Nothing user-facing is buildable until the schema and RLS are in place.

2. **Phase 1b — Curation before consumption:**
   - `apps/admin` clip CRUD + approve flow → embedding-on-approve → at least 30 clips in DB.
   - Onboarding interview cannot be built or demoed without a populated clip corpus. Building the user interview against an empty `clips` table produces non-deterministic, unimpressive output.

3. **Phase 1c — Interview, habits, check-ins:**
   - RAG search service → interview orchestrator → habit recommendation → habit cards → check-in/streak.
   - Each of these depends on the previous; build vertically (one slice end-to-end) before horizontally (more domains/features).

4. **Phase 1d — Public surfaces:**
   - `/h/[slug]` public pages, OG images, GDPR export. Cheap, depend only on schema.

5. **Phase 2 — Worker plug-in:**
   - Already-shipped `extraction_jobs` table + `clips_pending` table + `packages/api-contracts` mean Phase 2 is purely additive: `apps/worker/` Python code, plus an admin "review proposals" view. Zero rewrites in `apps/web`, `packages/core`, or `packages/db` schema.

**Phase 1 minimum viable architecture:**
- 2 Next.js apps, 4 packages (db, core, ui, config), `api-contracts` optional but cheap, `apps/worker/` is a stub directory.
- All Phase 2 hooks (job queue tables, contract schemas) exist in code but are unused.

**Phase 2 deferred extensions:**
- Python worker, transcripts cache (R2 bucket), Supabase realtime for admin "new proposal" notifications, batch embedding regeneration tooling.

## Sources

- [Next.js App Router — Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) — HIGH confidence
- [Server Actions vs Route Handlers (Next.js 15+)](https://makerkit.dev/blog/tutorials/server-actions-vs-route-handlers) — verified, MEDIUM-HIGH
- [Drizzle ORM — Vector similarity search with pgvector](https://orm.drizzle.team/docs/guides/vector-similarity-search) — HIGH confidence
- [Drizzle pgvector index-not-used issue (perf gotcha)](https://github.com/drizzle-team/drizzle-orm-docs/issues/436) — HIGH confidence (verified gotcha)
- [pgvector/pgvector-node](https://github.com/pgvector/pgvector-node) — HIGH confidence
- [Supabase RLS + Next.js SSR auth patterns (`@supabase/ssr`)](https://supabase.com/docs/guides/auth/server-side/nextjs) — HIGH confidence
- [Postgres `SELECT ... FOR UPDATE SKIP LOCKED` pattern for queues](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE) — HIGH confidence
- PROJECT.md (Hdiary) — authoritative for scope cuts (no community tables in MVP)

---
*Architecture research for: OSS evidence-backed habit tracker with podcast-clip RAG*
*Researched: 2026-05-07*
