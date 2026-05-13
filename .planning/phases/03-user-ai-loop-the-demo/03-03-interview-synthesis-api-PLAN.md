---
phase: 03-user-ai-loop-the-demo
plan: 03
type: execute
wave: 2
depends_on: ["03-01", "03-02"]
files_modified:
  - packages/core/src/interview/voiceSpec.ts
  - packages/core/src/interview/stateMachine.ts
  - packages/core/src/interview/stateMachine.test.ts
  - packages/core/src/interview/tools.ts
  - packages/core/src/interview/index.ts
  - packages/core/src/llm/aisdk.ts
  - apps/web/app/api/interview/route.ts
  - apps/web/app/api/synthesize/route.ts
  - apps/web/app/actions/start-interview.ts
  - apps/web/app/actions/finalize-interview.ts
  - apps/web/lib/db.ts
autonomous: true
requirements:
  - AION-01
  - AION-02
  - AION-03
  - AION-04
  - AION-05
  - AION-06
  - AION-07
  - AION-08
  - REC-01
  - REC-02
  - REC-03
  - REC-04
  - REC-06
user_setup: []
must_haves:
  truths:
    - "POST /api/interview streams an InterviewTurnOutput each turn using AI SDK v6 streamText + tool calling"
    - "fetch_relevant_clips tool calls hybridRetrieve with iterative_scan enabled in a transaction"
    - "After turn 3, retrieval is biased toward the largest-gap domain (AION-04)"
    - "Interview ends after 6–10 turns or when state machine detects sufficient coverage; max 10"
    - "Voice spec (≤3 sentences, no emoji, named-speaker citation, doctor-deferral for symptoms) is in a single file consumed by both turn route and synthesis route"
    - "POST /api/synthesize uses Sonnet (reasoning tier) with generateObject<SynthesisOutputSchema>; receives the 'tell me more' free-text + structured turn answers"
    - "Synthesis validates every candidate's citations via validateCitations; regenerates once if <2 valid; drops candidate after second failure"
    - "REC-03: synthesis prompt enforces ≥1 candidate per gap domain; post-validator rejects + regenerates if missing coverage"
    - "AION-07: free-text user fields only flow into LLM payloads when profiles.consent_free_text_ai = true"
    - "AION-08: cheap tier (Haiku 4.5 / GPT-4o-mini) for turns; reasoning tier (Sonnet 4.x) for synthesis"
    - "AION-09: all LLM calls go through packages/core/src/llm/* — no direct @ai-sdk imports in apps/web routes"
    - "REC-06: starting a new interview creates a new interview_runs row (run_index increments); existing runs not overwritten"
  artifacts:
    - path: "apps/web/app/api/interview/route.ts"
      provides: "Streaming interview turn endpoint"
      contains: "toUIMessageStreamResponse"
    - path: "apps/web/app/api/synthesize/route.ts"
      provides: "Sonnet structured-output synthesis with citation validation"
      contains: "SynthesisOutputSchema"
    - path: "packages/core/src/interview/voiceSpec.ts"
      provides: "Single source of interview persona discipline"
      contains: "INTERVIEW_VOICE_SPEC"
    - path: "packages/core/src/interview/stateMachine.ts"
      provides: "Turn budget + gap detection + doneness predicate"
      contains: "computeNextTurn"
  key_links:
    - from: "apps/web/app/api/interview/route.ts"
      to: "packages/core/src/retrieval/hybridRetrieve.ts"
      via: "fetch_relevant_clips tool calls hybridRetrieve"
      pattern: "hybridRetrieve"
    - from: "apps/web/app/api/synthesize/route.ts"
      to: "packages/core/src/recommendations/validateCitations.ts"
      via: "post-generation citation validation"
      pattern: "validateCitations"
    - from: "apps/web/app/api/interview/route.ts"
      to: "packages/core/src/llm/aisdk.ts"
      via: "wrapper provides AI SDK v6 model resolved by tier"
      pattern: "getAiSdkModel\\('cheap'\\)"
---

<objective>
Build the interview turn API (cheap-tier streaming with tool calling), the synthesis API (Sonnet structured output + citation grounding), the interview state machine, and the voice spec. All LLM access goes through `packages/core/src/llm/*`.

Purpose: This is the AI brain of Phase 3. Plan 03-04 will consume these endpoints from the UI. Plan 03-06 reuses `hybridRetrieve` for swap.

Output: Two route handlers, three library files (voiceSpec, stateMachine, tools), one AI SDK v6 model resolver inside the existing LLM wrapper.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md
@.planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md
@packages/core/src/llm/provider.ts
@packages/core/src/llm/registry.ts
@packages/core/src/retrieval/hybridRetrieve.ts
@packages/core/src/recommendations/validateCitations.ts
@packages/core/src/interview/schemas.ts
@packages/db/src/schema/interview-runs.ts
@packages/db/src/schema/profiles.ts

<interfaces>
From Plan 03-01:
- `InterviewTurnOutputSchema`, `HabitCandidateSchema`, `SynthesisOutputSchema`, `CitationSchema`, `Domain` from `@cited/core/interview/schemas` (re-exported from `@cited/core`)
- `interviewRuns` table: id, userId, runIndex, profileJson, candidatesJson, startedAt, completedAt

From Plan 03-02:
- `hybridRetrieve(query, embedQuery, textQuery, filters, limit): Promise<readonly RankedClip[]>`
- `validateCitations(citations, clipLookup, nearest): Promise<{valid, dropped}>`

From existing code:
- `getLlm()` returns `LlmProvider`; `getEmbeddings()` returns `EmbeddingProvider` (registry.ts)
- `groundingCheck` + `NearestChunkQuery` from `@cited/core/llm/grounding/similarityCheck`
- `profiles.consentFreeTextAi` boolean column on profiles table (AUTH-05c gate)
- Auth: `getSessionUser()` already exists (Phase 1) — `apps/web/lib/auth.ts` or similar
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Interview voice spec + state machine + tool definition</name>
  <read_first>
    - packages/core/src/interview/schemas.ts (InterviewTurnOutputSchema, Domain)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 3" (AI SDK v6 tool calling) + §"Pitfall 8" (voice spec) + §"State of the Art"
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-01, D-02, D-03
  </read_first>
  <behavior>
    - Test 1: computeNextTurn(history) where turnCount < 3 → returns turnPlan with `priorityDomain: null` (no bias yet — AION-04)
    - Test 2: At turnCount=3, with domainCoverage={sleep:2, nutrition_gut:1, exercise_longevity:0, mental_health:0} → returns priorityDomain ∈ {'exercise_longevity','mental_health'} (largest gaps)
    - Test 3: At turnCount=10 → returns `done: true` (hard cap)
    - Test 4: At turnCount>=6 with all 4 domains touched at least once AND `userDoneSignal` → returns `done: true`
    - Test 5: At turnCount=5 with all 4 domains touched at least twice → returns `done: true` (early termination on coverage)
  </behavior>
  <action>
    1. Create `packages/core/src/interview/voiceSpec.ts`:

       ```ts
       /**
        * INTERVIEW VOICE SPEC — single source of truth (Pitfall 15 mitigation).
        * Used as the system prompt for cheap-tier turns AND included verbatim in Sonnet synthesis prompt.
        */
       export const INTERVIEW_VOICE_SPEC = `You are a careful, curious interviewer helping a user discover habits backed by real podcast evidence from "The Diary of a CEO". You are NOT a doctor.

       VOICE DISCIPLINE:
       - ≤ 3 sentences per turn. Never more.
       - No emoji. No exclamation marks. No second-person hectoring ("you should", "you must").
       - When citing evidence, name the speaker explicitly ("Dr. Matthew Walker said...", "Professor Tim Spector said...").
       - If the user mentions a symptom, diagnosis, or medication, respond verbatim: "I'd suggest checking that with a clinician. Meanwhile, [continue conversation]."
       - Never give medical advice. Never use the words "prescribed", "diagnose", "treatment", "dosage".

       DOMAIN COVERAGE:
       The four domains are: sleep, nutrition_gut, exercise_longevity, mental_health.
       Across 6–10 turns, surface each domain at least once. After turn 3, prioritize the user's largest gap.

       OUTPUT:
       Each turn returns a JSON object matching InterviewTurnOutputSchema: a short question (≤3 sentences), 3–4 multiple-choice chips, optional priority domain, and clip ids you grounded the question in (via the fetch_relevant_clips tool — call it BEFORE proposing each domain question).
       ` as const;
       ```

    2. Create `packages/core/src/interview/stateMachine.ts`:

       ```ts
       import type { Domain } from './schemas';

       export type DomainCoverage = Readonly<Record<Domain, number>>;

       export type TurnPlan = {
         readonly turnIndex: number;       // 1-based, next turn to issue
         readonly priorityDomain: Domain | null;
         readonly done: boolean;
         readonly doneReason: 'hard_cap' | 'coverage_complete' | 'user_signal' | null;
       };

       export const MAX_TURNS = 10;
       export const MIN_TURNS = 6;

       export function computeNextTurn(input: {
         readonly turnCount: number;
         readonly domainCoverage: DomainCoverage;
         readonly userDoneSignal: boolean;
       }): TurnPlan {
         const { turnCount, domainCoverage, userDoneSignal } = input;
         if (turnCount >= MAX_TURNS) {
           return { turnIndex: turnCount + 1, priorityDomain: null, done: true, doneReason: 'hard_cap' };
         }
         const allTouched = Object.values(domainCoverage).every((n) => n >= 1);
         const allDoubleTouched = Object.values(domainCoverage).every((n) => n >= 2);
         if (turnCount >= MIN_TURNS && allTouched && userDoneSignal) {
           return { turnIndex: turnCount + 1, priorityDomain: null, done: true, doneReason: 'user_signal' };
         }
         if (turnCount >= 5 && allDoubleTouched) {
           return { turnIndex: turnCount + 1, priorityDomain: null, done: true, doneReason: 'coverage_complete' };
         }
         let priority: Domain | null = null;
         if (turnCount >= 3) {
           const sorted = (Object.entries(domainCoverage) as [Domain, number][])
             .sort((a, b) => a[1] - b[1]);
           priority = sorted[0]?.[0] ?? null;
         }
         return { turnIndex: turnCount + 1, priorityDomain: priority, done: false, doneReason: null };
       }
       ```

    3. Create `packages/core/src/interview/tools.ts` — Zod schema for the `fetch_relevant_clips` tool (the AI SDK tool wrapper itself is constructed in `apps/web/app/api/interview/route.ts` since it needs access to the DB; this file just exports the input schema):

       ```ts
       import { z } from 'zod';
       import { DomainSchema } from './schemas';

       export const FetchRelevantClipsInput = z.object({
         query: z.string().min(3).describe('Short search phrase capturing the user need'),
         domain: DomainSchema.optional().describe('Constrain retrieval to a specific domain'),
       });
       export type FetchRelevantClipsInput = z.infer<typeof FetchRelevantClipsInput>;
       ```

    4. Update `packages/core/src/interview/index.ts` to re-export voiceSpec, stateMachine, tools.

    5. Write `stateMachine.test.ts` covering the 5 behaviors.
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test -- stateMachine</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/interview/voiceSpec.ts`
    - `test -f packages/core/src/interview/stateMachine.ts`
    - `test -f packages/core/src/interview/tools.ts`
    - `grep -q "INTERVIEW_VOICE_SPEC" packages/core/src/interview/voiceSpec.ts` returns 0
    - `grep -q "≤ 3 sentences\|<= 3 sentences\|3 sentences" packages/core/src/interview/voiceSpec.ts` returns 0
    - `grep -q "I'd suggest checking that with a clinician" packages/core/src/interview/voiceSpec.ts` returns 0
    - `grep -q "MAX_TURNS = 10" packages/core/src/interview/stateMachine.ts` returns 0
    - `pnpm --filter @cited/core test -- stateMachine` exits 0
  </acceptance_criteria>
  <done>Voice + state machine + tool input contract locked; route handlers consume them.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: AI SDK v6 model resolver inside @cited/core/llm + interview route handler</name>
  <read_first>
    - packages/core/src/llm/registry.ts (getLlm, getEmbeddings patterns)
    - packages/core/src/llm/types.ts (LlmTier)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 3" (full route handler example) + §"Server-side LLM tier resolution"
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-01, D-02 (UI shape — affects what the turn output must include)
    - packages/db/src/schema/interview-runs.ts and profiles.ts
    - apps/web/lib/db.ts if exists (Drizzle client) or apps/web/lib/supabase.ts
  </read_first>
  <behavior>
    - Test 1 (integration, vitest with mocked DB): POSTing a valid messages array returns a streaming response with `Content-Type: text/event-stream` or similar AI SDK v6 stream
    - Test 2: When `profiles.consentFreeTextAi = false` for the user, the route ignores user-supplied free-text and uses only chip-selection state
    - Test 3 (unit): `getAiSdkModel('cheap')` returns a LanguageModel that resolves to Haiku/GPT-4o-mini based on env (LLM_MODEL_CHEAP)
    - Test 4 (unit): `getAiSdkModel('reasoning')` returns Sonnet (LLM_MODEL_REASONING)
  </behavior>
  <action>
    1. Create `packages/core/src/llm/aisdk.ts` — the **only** place `@ai-sdk/openai` and `@ai-sdk/anthropic` LanguageModel constructors are referenced (AION-09):

       ```ts
       import { anthropic } from '@ai-sdk/anthropic';
       import { openai } from '@ai-sdk/openai';
       import type { LanguageModel } from 'ai';
       import type { LlmTier } from './types';

       /**
        * Returns an AI SDK v6 LanguageModel for the given tier.
        * Env:
        *   LLM_MODEL_CHEAP      default 'claude-haiku-4-5'      (set 'gpt-4o-mini' to use OpenAI)
        *   LLM_MODEL_REASONING  default 'claude-sonnet-4-5'
        *   LLM_PROVIDER         'anthropic' (default) | 'openai'
        */
       export function getAiSdkModel(tier: LlmTier): LanguageModel {
         const provider = process.env['LLM_PROVIDER'] ?? 'anthropic';
         if (tier === 'cheap') {
           const id = process.env['LLM_MODEL_CHEAP'] ?? (provider === 'openai' ? 'gpt-4o-mini' : 'claude-haiku-4-5');
           return provider === 'openai' ? openai(id) : anthropic(id);
         }
         const id = process.env['LLM_MODEL_REASONING'] ?? 'claude-sonnet-4-5';
         return provider === 'openai' ? openai(id) : anthropic(id);
       }
       ```

       Add to `packages/core/src/llm/index.ts` (if exists) or create it: `export { getAiSdkModel } from './aisdk';` Re-export from `@cited/core` barrel.

    2. Create `apps/web/app/api/interview/route.ts` (Edge or Node runtime — use Node because of pgvector queries):

       ```ts
       // apps/web/app/api/interview/route.ts
       import { streamText, convertToModelMessages, tool, type UIMessage } from 'ai';
       import { z } from 'zod';
       import {
         INTERVIEW_VOICE_SPEC,
         computeNextTurn,
         FetchRelevantClipsInput,
         InterviewTurnOutputSchema,
       } from '@cited/core';
       import { hybridRetrieve, type HybridQueryFn } from '@cited/core';
       import { getAiSdkModel } from '@cited/core';
       import { getEmbeddings } from '@cited/core';
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';
       import { sql } from 'drizzle-orm';

       export const runtime = 'nodejs';
       export const maxDuration = 30;

       const RequestSchema = z.object({
         messages: z.array(z.any()),   // UIMessage[] — server doesn't deeply validate parts shape
         runId: z.string().uuid(),
         turnCount: z.number().int().min(0).max(10),
         domainCoverage: z.record(z.string(), z.number()).default({}),
         userDoneSignal: z.boolean().default(false),
       });

       export async function POST(req: Request) {
         const user = await getSessionUser();
         if (!user) return new Response('Unauthorized', { status: 401 });

         const body = RequestSchema.parse(await req.json());
         const db = getDb();

         // AION-07: free-text gate — check consent before allowing free-text content through.
         // (Free-text user input is in messages[].parts; if consent is false, the client should not
         //  send it, but defensively strip on server.)
         const profile = await db.query.profiles.findFirst({ where: (p, { eq }) => eq(p.userId, user.id) });
         const allowFreeText = profile?.consentFreeTextAi === true;

         const plan = computeNextTurn({
           turnCount: body.turnCount,
           domainCoverage: body.domainCoverage as Record<'sleep'|'nutrition_gut'|'exercise_longevity'|'mental_health', number>,
           userDoneSignal: body.userDoneSignal,
         });

         // Caller-supplied hybrid query (HybridQueryFn) — runs inside a transaction with iterative_scan.
         const hybridQuery: HybridQueryFn = async ({ embedQuery, textQuery, filters, limit }) => {
           return db.transaction(async (tx) => {
             await tx.execute(sql`SET LOCAL hnsw.iterative_scan = strict_order`);
             await tx.execute(sql`SET LOCAL hnsw.max_scan_tuples = 20000`);
             // The full RRF SQL is documented verbatim in packages/core/src/retrieval/hybridRetrieve.ts JSDoc.
             // Paste it here as a drizzle sql`` template, parameterized by:
             //   $1 = filters.domains ?? null (text[])
             //   $2 = filters.excludeRiskFlags ?? '{}' (text[])
             //   $3 = filters.excludeClipIds ?? null (uuid[])
             //   $4 = embedQuery (vector)
             //   $5 = textQuery
             //   $6 = limit
             const rows = await tx.execute(sql`/* PASTE RRF SQL FROM hybridRetrieve.ts JSDoc */`);
             return rows.map((r) => ({
               clipId: r.clip_id as string,
               similarityScore: Number(r.similarity_score),
               vectorScore: Number(r.vector_score),
               textScore: Number(r.text_score),
               claim: r.claim as string,
               speaker: r.speaker as string,
               domain: r.domain as 'sleep'|'nutrition_gut'|'exercise_longevity'|'mental_health',
             }));
           });
         };

         const result = streamText({
           model: getAiSdkModel('cheap'),    // AION-08
           system: INTERVIEW_VOICE_SPEC + (plan.priorityDomain ? `\n\nThis turn focuses on: ${plan.priorityDomain}.` : ''),
           messages: convertToModelMessages(body.messages as UIMessage[]),
           tools: {
             fetch_relevant_clips: tool({
               description:
                 'Retrieve 3–5 approved DOAC clips relevant to a query within a domain. ' +
                 'Call this BEFORE proposing any habit-related question to ground the question in real evidence.',
               inputSchema: FetchRelevantClipsInput,
               execute: async ({ query, domain }) => {
                 const { embeddings } = await getEmbeddings().embed({ input: [query] });
                 const clips = await hybridRetrieve(
                   hybridQuery,
                   embeddings[0],
                   query,
                   {
                     domains: domain ? [domain] : (plan.priorityDomain ? [plan.priorityDomain] : undefined),
                     excludeRiskFlags: ['medical_advice', 'supplement', 'contraindication'],
                   },
                   5,
                 );
                 return { clips };
               },
             }),
           },
         });

         return result.toUIMessageStreamResponse();
       }
       ```

       Note: The verbatim RRF SQL must be pasted from the JSDoc in `packages/core/src/retrieval/hybridRetrieve.ts` (Plan 03-02 made it the canonical reference). Drizzle-bind parameters using `sql.placeholder` or inline `sql` interpolations.

    3. Implement `apps/web/lib/db.ts` if missing — Drizzle client with `postgres` driver and `prepare: false` (per CLAUDE.md / Phase 1 pattern). If it exists, just import.

    4. Write tests:
       - `packages/core/src/llm/aisdk.test.ts` — env-controlled tier resolution
       - `apps/web/app/api/interview/route.test.ts` — vitest with mocked db + mocked getAiSdkModel; smoke that POST returns 200 with stream-shaped response
  </action>
  <verify>
    <automated>pnpm --filter @cited/core test -- aisdk &amp;&amp; pnpm --filter @cited/web typecheck</automated>
  </verify>
  <acceptance_criteria>
    - `test -f packages/core/src/llm/aisdk.ts`
    - `grep -q "@ai-sdk/anthropic\|@ai-sdk/openai" apps/web/app/api/interview/route.ts` returns 1 (no direct AI SDK provider imports in routes — AION-09)
    - `grep -q "getAiSdkModel" apps/web/app/api/interview/route.ts` returns 0
    - `grep -q "INTERVIEW_VOICE_SPEC" apps/web/app/api/interview/route.ts` returns 0
    - `grep -q "fetch_relevant_clips" apps/web/app/api/interview/route.ts` returns 0
    - `grep -q "hybridRetrieve" apps/web/app/api/interview/route.ts` returns 0
    - `grep -q "SET LOCAL hnsw.iterative_scan" apps/web/app/api/interview/route.ts` returns 0
    - `grep -q "toUIMessageStreamResponse" apps/web/app/api/interview/route.ts` returns 0
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Interview turn API streams via AI SDK v6, tool-grounded in hybrid retrieval, voice spec applied; all LLM access through @cited/core.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Synthesis route handler with Sonnet generateObject + citation grounding + regenerate-on-fail + interview_runs persistence</name>
  <read_first>
    - packages/core/src/interview/schemas.ts (SynthesisOutputSchema, HabitCandidateSchema)
    - packages/core/src/recommendations/validateCitations.ts (signature from Plan 03-02)
    - packages/core/src/llm/grounding/similarityCheck.ts (NearestChunkQuery shape)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 4: Citation grounding" + §"Pitfall 7"
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-03 ("tell me more" free-text)
    - packages/db/src/schema/interview-runs.ts
  </read_first>
  <behavior>
    - Test 1: Sonnet returns 5 candidates, all citations valid → response 200, all 5 returned, interview_runs row updated with candidatesJson + completedAt
    - Test 2: Sonnet returns a candidate with both citations invalid → regenerate that candidate once; if regen also fails (<2 valid), drop the candidate; if total <3 candidates remain, regenerate the full batch once
    - Test 3: gapDomains has [sleep, exercise_longevity] but Sonnet returns 5 candidates all in [sleep] → REC-03 validator triggers regenerate with `must_cover_domains` constraint
    - Test 4: AUTH-05c opt-out: `tellMeMoreFreeText` is provided but profile.consentFreeTextAi=false → free text is dropped from Sonnet payload (test asserts the prompt doesn't contain the free text)
    - Test 5: REC-06: starting a fresh synthesis when an interview_runs row already exists for this user creates a NEW row with run_index = max(existing) + 1 (handled in start-interview action; verified in test 5 of Task 4 below if cleaner there)
  </behavior>
  <action>
    1. Create `apps/web/app/api/synthesize/route.ts`:

       ```ts
       import { generateObject } from 'ai';
       import { z } from 'zod';
       import {
         SynthesisOutputSchema,
         HabitCandidateSchema,
         INTERVIEW_VOICE_SPEC,
         validateCitations,
         getAiSdkModel,
         getEmbeddings,
       } from '@cited/core';
       import { groundingCheck } from '@cited/core'; // re-exported? if not, deep import — but prefer barrel
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';
       import { eq, sql } from 'drizzle-orm';
       import { interviewRuns, clips, transcriptChunks } from '@cited/db/schema';

       export const runtime = 'nodejs';
       export const maxDuration = 60;

       const RequestSchema = z.object({
         runId: z.string().uuid(),
         structuredAnswers: z.array(z.object({
           turn: z.number(),
           domain: z.enum(['sleep','nutrition_gut','exercise_longevity','mental_health']).optional(),
           question: z.string(),
           choiceLabel: z.string(),
           freeText: z.string().optional(),
         })),
         tellMeMoreFreeText: z.string().max(2000).optional(),
         retrievedClipIds: z.array(z.string().uuid()).min(1),    // clips the interview turns surfaced
       });

       const MAX_REGEN_ATTEMPTS = 1;

       export async function POST(req: Request) {
         const user = await getSessionUser();
         if (!user) return new Response('Unauthorized', { status: 401 });
         const body = RequestSchema.parse(await req.json());
         const db = getDb();

         const profile = await db.query.profiles.findFirst({
           where: (p, { eq }) => eq(p.userId, user.id),
         });
         const allowFreeText = profile?.consentFreeTextAi === true;

         // Strip free text on AUTH-05c opt-out
         const sanitizedAnswers = allowFreeText
           ? body.structuredAnswers
           : body.structuredAnswers.map(({ freeText, ...rest }) => rest);
         const tellMeMore = allowFreeText ? body.tellMeMoreFreeText : undefined;

         // Fetch the retrieved clips' canonical text for the prompt
         const retrievedClips = await db.query.clips.findMany({
           where: (c, { inArray, eq, and, isNull }) => and(
             inArray(c.id, body.retrievedClipIds),
             eq(c.status, 'approved'),
             isNull(c.removedAt),
           ),
         });

         const prompt = buildSynthesisPrompt({
           answers: sanitizedAnswers,
           tellMeMore,
           retrievedClips: retrievedClips.map((c) => ({ id: c.id, claim: c.claim, speaker: c.speaker, domain: c.domain })),
         });

         // Helpers used by validateCitations
         const clipLookup = async (clipId: string) => {
           const row = await db.query.clips.findFirst({ where: (c, { eq }) => eq(c.id, clipId) });
           return row ? { id: row.id, status: row.status, claim: row.claim, removedAt: row.removedAt } : null;
         };
         const nearest: import('@cited/core').NearestChunkQuery = async (vec, clipId) => {
           const rows = await db.execute(sql`
             SELECT 1 - (embedding <=> ${vec}::vector) AS similarity
             FROM transcript_chunks
             WHERE episode_id = (SELECT episode_id FROM clips WHERE id = ${clipId})
             ORDER BY embedding <=> ${vec}::vector LIMIT 1
           `);
           const row = rows[0];
           return row ? Number(row.similarity) : null;
         };

         // 1st pass
         let output = await generateSynthesis(prompt);
         let validated = await validateOutput(output, clipLookup, nearest);

         // Regenerate up to MAX_REGEN_ATTEMPTS if any candidate has <2 valid citations OR gap-domain coverage missing
         let attempt = 0;
         while (attempt < MAX_REGEN_ATTEMPTS && !validated.allCandidatesOk) {
           output = await generateSynthesis(prompt + '\n\nREGENERATION: Previous output had citation or domain-coverage failures. Output must satisfy: every candidate has ≥2 citations whose claim text matches the retrieved-clip claim by cosine ≥ 0.85; gapDomains must each appear in at least one candidate.');
           validated = await validateOutput(output, clipLookup, nearest);
           attempt++;
         }

         // Final: drop any still-invalid candidates; if <3 remain, surface a soft error (do not block — return what we have with a warning)
         const finalCandidates = validated.candidates.filter((c) => c.valid).map((c) => ({ ...c.candidate, citations: c.validCitations }));

         // Persist
         await db.update(interviewRuns)
           .set({
             profileJson: output.profileSummary,
             candidatesJson: finalCandidates,
             completedAt: new Date(),
           })
           .where(eq(interviewRuns.id, body.runId));

         return Response.json({
           candidates: finalCandidates,
           profile: output.profileSummary,
           droppedCitations: validated.allDropped,
         });

         async function generateSynthesis(p: string) {
           const { object } = await generateObject({
             model: getAiSdkModel('reasoning'),    // AION-08 Sonnet
             system: INTERVIEW_VOICE_SPEC,
             schema: SynthesisOutputSchema,
             prompt: p,
           });
           return object;
         }
       }

       function buildSynthesisPrompt(args: { answers: unknown[]; tellMeMore?: string; retrievedClips: Array<{id: string; claim: string; speaker: string; domain: string}> }): string {
         const clipsBlock = args.retrievedClips
           .map((c) => `- id: ${c.id} | domain: ${c.domain} | speaker: ${c.speaker} | claim: "${c.claim}"`)
           .join('\n');
         return [
           'Synthesize 3–5 habit candidates from this interview.',
           '',
           'STRUCTURED ANSWERS:',
           JSON.stringify(args.answers, null, 2),
           '',
           args.tellMeMore ? `USER FREE-TEXT ("anything else to share"):\n${args.tellMeMore}\n` : '',
           '',
           'RETRIEVED CLIPS (cite ONLY these clip ids):',
           clipsBlock,
           '',
           'REQUIREMENTS:',
           '- Output must match SynthesisOutputSchema exactly.',
           '- Every candidate has 2–3 citations whose clipId is from the list above.',
           '- The model-quoted claim string in each citation MUST closely paraphrase the listed clip\'s claim (similarity ≥ 0.85 will be checked post-generation).',
           '- profileSummary.gapDomains lists domains with low coverage in the user\'s answers.',
           '- Every domain in gapDomains must appear in at least one candidate (REC-03).',
           '- Each candidate needs a `trigger` (when/where, implementation-intention) and `tinyAction` (≤80 chars, BJ Fogg minimum).',
         ].join('\n');
       }

       async function validateOutput(output: import('@cited/core').SynthesisOutput, clipLookup: import('@cited/core').ClipLookup, nearest: import('@cited/core').NearestChunkQuery) {
         const gapDomains = output.profileSummary.gapDomains;
         const candidates = await Promise.all(output.candidates.map(async (c) => {
           const result = await validateCitations(c.citations, clipLookup, nearest);
           return { candidate: c, validCitations: result.valid, dropped: result.dropped, valid: result.valid.length >= 2 };
         }));
         const domainsPresent = new Set(candidates.filter((c) => c.valid).map((c) => c.candidate.domain));
         const allCandidatesOk = candidates.every((c) => c.valid) && gapDomains.every((d) => domainsPresent.has(d));
         const allDropped = candidates.flatMap((c) => c.dropped);
         return { candidates, domainsPresent, allCandidatesOk, allDropped };
       }
       ```

    2. Implement `validateOutput` to:
       - For each candidate, call `validateCitations(c.citations, clipLookup, nearest)`.
       - Mark candidate as `valid: false` if `valid.length < 2`.
       - Compute `domainsPresent` from valid candidates; check `output.profileSummary.gapDomains.every(d => domainsPresent.has(d))`. Mark `allCandidatesOk: false` if not.
       - Return aggregate.

    3. Write `apps/web/app/api/synthesize/route.test.ts` covering behaviors 1–4. Mock `generateObject` (e.g. via vi.mock('ai')) to return canned SynthesisOutput.

    4. Create `apps/web/app/actions/start-interview.ts` (Server Action) — REC-06:

       ```ts
       'use server';
       import { interviewRuns } from '@cited/db/schema';
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';
       import { eq, desc, sql } from 'drizzle-orm';

       export async function startInterviewAction(): Promise<{ runId: string; runIndex: number }> {
         const user = await getSessionUser();
         if (!user) throw new Error('Unauthorized');
         const db = getDb();
         const last = await db.query.interviewRuns.findFirst({
           where: (r, { eq }) => eq(r.userId, user.id),
           orderBy: (r, { desc }) => desc(r.runIndex),
         });
         const nextIndex = (last?.runIndex ?? 0) + 1;
         const [row] = await db.insert(interviewRuns).values({
           userId: user.id,
           runIndex: nextIndex,
         }).returning({ id: interviewRuns.id, runIndex: interviewRuns.runIndex });
         return { runId: row.id, runIndex: row.runIndex };
       }
       ```

    5. Create `apps/web/app/actions/finalize-interview.ts` — bulk-insert `user_habits` rows from accepted candidates (called after swipe stack in 03-04).
  </action>
  <verify>
    <automated>pnpm --filter @cited/web typecheck &amp;&amp; pnpm --filter @cited/web test -- synthesize</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/app/api/synthesize/route.ts`
    - `test -f apps/web/app/actions/start-interview.ts`
    - `grep -q "generateObject" apps/web/app/api/synthesize/route.ts` returns 0
    - `grep -q "SynthesisOutputSchema" apps/web/app/api/synthesize/route.ts` returns 0
    - `grep -q "validateCitations" apps/web/app/api/synthesize/route.ts` returns 0
    - `grep -q "consentFreeTextAi" apps/web/app/api/synthesize/route.ts` returns 0
    - `grep -q "getAiSdkModel('reasoning')" apps/web/app/api/synthesize/route.ts` returns 0
    - `grep -q "interviewRuns" apps/web/app/api/synthesize/route.ts` returns 0
    - `grep -q "runIndex" apps/web/app/actions/start-interview.ts` returns 0
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Synthesis route works end-to-end: Sonnet structured output → citation validation → regenerate-on-fail → persist to interview_runs. REC-06 via start-interview action.</done>
</task>

</tasks>

<verification>
- All routes typecheck
- Interview state machine unit tests pass
- Synthesis route mocked test passes
- `grep -r "@ai-sdk/" apps/web/app` returns nothing outside `packages/core` paths (AION-09)
</verification>

<success_criteria>
POST /api/interview streams turns grounded in real clips; POST /api/synthesize returns 3–5 candidates with validated citations and persists to interview_runs. AUTH-05c gate honored. AION-09 enforced.
</success_criteria>

<output>
After completion, create `.planning/phases/03-user-ai-loop-the-demo/03-03-SUMMARY.md` listing: route paths, request/response Zod shapes, env vars (LLM_MODEL_CHEAP, LLM_MODEL_REASONING, LLM_PROVIDER), regenerate budget.
</output>
