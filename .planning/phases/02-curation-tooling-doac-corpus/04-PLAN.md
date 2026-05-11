---
phase: 02-curation-tooling-doac-corpus
plan: 04
type: execute
wave: 4
depends_on: ["02-01", "02-02", "02-03"]
files_modified:
  - apps/web/app/actions/curate/schemas.ts
  - apps/web/lib/curate/hardBlockKeywords.ts
  - apps/web/lib/curate/hardBlockKeywords.test.ts
  - apps/web/app/actions/curate/approveClip.ts
  - apps/web/app/actions/curate/approveClip.test.ts
  - apps/web/app/actions/curate/copilot.ts
  - apps/web/app/actions/curate/copilot.test.ts
  - packages/core/src/llm/copilot/schemas.ts
  - packages/core/src/llm/copilot/prompts.ts
  - packages/core/src/llm/copilot/index.ts
  - packages/core/src/llm/grounding/similarityCheck.ts
  - packages/core/src/llm/grounding/similarityCheck.test.ts
  - apps/web/app/api/admin/copilot/stream/route.ts
  - apps/web/app/(admin)/curate/editor/[clipId]/page.tsx
  - apps/web/app/(admin)/curate/_components/editor/ThreePanePanels.tsx
  - apps/web/app/(admin)/curate/_components/editor/TranscriptPane.tsx
  - apps/web/app/(admin)/curate/_components/editor/PlayerPane.tsx
  - apps/web/app/(admin)/curate/_components/editor/MetadataTab.tsx
  - apps/web/app/(admin)/curate/_components/editor/CopilotTab.tsx
  - apps/web/app/(admin)/curate/_components/copilot/SuggestionCard.tsx
  - apps/web/app/(admin)/curate/_components/copilot/DiffView.tsx
  - apps/web/app/(admin)/curate/_components/copilot/AION10Badge.tsx
  - apps/web/app/(admin)/curate/_components/editor/MetadataTab.test.tsx
  - apps/web/app/(admin)/curate/_components/editor/TranscriptPane.test.tsx
autonomous: true
requirements: [ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-10, ADMN-11, ADMN-14, ADMN-15, LGL-08]
must_haves:
  truths:
    - "Clip editor renders three-pane workspace: virtualized transcript / sticky YouTubeEmbed / tabbed metadata+copilot"
    - "Word-anchored selection (click + shift-click) produces start/end seconds aligned with player auto-seek"
    - "Approving a clip writes a 1536-dim embedding to clips.embedding via embedClip()"
    - "Approval rejects clips that touch prescription drug names or dosing patterns (ADMN-06)"
    - "Risk flags are mandatory at approval; zod rejects empty riskFlags"
    - "Three preset co-pilot endpoints stream typed objects via Vercel AI SDK streamObject"
    - "Every AI suggestion, accept, and reject inserts a clip_edits row with the locked payload shape"
    - "AION-10 grounding cosine ≥0.85 check runs onFinish and stores similarity in clip_edits.payload"
  artifacts:
    - path: "apps/web/app/(admin)/curate/editor/[clipId]/page.tsx"
      provides: "Server component shell loading clip + transcript + episode for the editor"
    - path: "apps/web/app/(admin)/curate/_components/editor/ThreePanePanels.tsx"
      provides: "react-resizable-panels three-pane layout"
    - path: "apps/web/app/(admin)/curate/_components/editor/TranscriptPane.tsx"
      provides: "Virtualized word renderer with click/shift-click selection + keyboard shortcuts"
    - path: "apps/web/app/actions/curate/approveClip.ts"
      provides: "Approve server action with hard-block + embed-on-approve + clip_edits"
    - path: "apps/web/app/api/admin/copilot/stream/route.ts"
      provides: "streamObject endpoint per preset (suggest-start-end | refine-claim | propose-alternative)"
    - path: "packages/core/src/llm/grounding/similarityCheck.ts"
      provides: "AION-10 production grounding cosine check"
  key_links:
    - from: "apps/web/app/actions/curate/approveClip.ts"
      to: "packages/core/src/embeddings/embedClip.ts"
      via: "Imported and called inside the approve transaction"
      pattern: "embedClip\("
    - from: "apps/web/app/api/admin/copilot/stream/route.ts"
      to: "packages/core/src/llm + grounding/similarityCheck"
      via: "streamObject with onFinish that calls groundingCheck and inserts clip_edits"
      pattern: "streamObject|groundingCheck"
    - from: "apps/web/app/(admin)/curate/_components/editor/MetadataTab.tsx"
      to: "approveClip server action"
      via: "form onSubmit → approveClip(input)"
      pattern: "approveClip"
---

<objective>
Build the clip editor — the heart of Phase 2. Three-pane workspace (virtualized transcript / sticky `<YouTubeEmbed>` / tabbed metadata+copilot) per UI-SPEC §"Surface-Specific Layout Contracts" #2 and #3. Server-side: the `approveClip` action with hard-block validation (ADMN-06), mandatory risk flags (ADMN-05), embed-on-approve (ADMN-04), and `clip_edits` writes (ADMN-11). The AI co-pilot route streams typed objects (Vercel AI SDK `streamObject`) for three preset endpoints (ADMN-10), runs the AION-10 production grounding check on `onFinish`, and writes `clip_edits` rows with the locked `payload` shape. Manual scrub-and-cut (ADMN-14) lives in the transcript pane with the locked keyboard shortcuts (`[` set start, `]` set end, `space` play/pause, `←/→` ±0.5s, `± nudge` ±0.1s).

Purpose: Land the curator's primary work surface. Once this plan is green, the curator can hand-cut + AI-co-pilot clips through `pending → published` and a 1536-dim vector lands in `clips.embedding`.

Output: Server action + AI route + grounding check + 9 React components + tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md
@.planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md
@.planning/phases/02-curation-tooling-doac-corpus/02-UI-SPEC.md
@packages/db/src/schema/clips.ts
@packages/db/src/schema/clip-edits.ts
@packages/db/src/schema/transcripts.ts
@packages/db/src/schema/transcript-chunks.ts
@packages/core/src/embeddings/embedClip.ts
@packages/core/src/llm/registry.ts
@apps/web/app/actions/curate/schemas.ts

<interfaces>
From Phase 1 schema (clips.ts) — clip columns to update on approve:
- status (clipStatus enum), embedding (vector 1536), approvedAt, approvedBy, claim, rationale, speaker, speakerStatus, domain, riskFlags (text[]), startSeconds (int), endSeconds (int), evidenceStrength (enum)

From Plan 01 — extended clip_edits:
- columns: clipId, actorId, source ('manual' | 'ai_copilot'), field, action (clip_edit_action enum), payload (jsonb), beforeValue, afterValue, accepted, createdAt

From Plan 03:
- `embedClip({claim, rationale}): Promise<number[]>` — 1536-dim
- shared schemas in `apps/web/app/actions/curate/schemas.ts` (domainEnum, speakerStatusEnum, riskFlagEnum)

From `@hdiary/core` LLM wrapper:
- `getLlm()` returns provider with `complete` / `completeStructured` — for streaming `streamObject` we still use Vercel AI SDK 5 directly from the route handler, BUT we MUST instantiate the model via the wrapper's exported helper to keep noRestrictedImports happy. Plan 04 Task 3 adds a `streamCopilotObject(opts)` helper inside `packages/core/src/llm/copilot/` so route handlers never import `@ai-sdk/anthropic` directly.

UI-SPEC locked tokens (UI-DESIGN.md): use `--color-paper`, `--color-paper-2`, `--color-paper-3`, `--color-rule`, `--color-ink`, `--color-ink-3`, `--color-accent`, `--color-accent-soft`, `--color-accent-deep`, `--color-warn`. Type scale: 24/16/14/12 only. Fonts: Geist Sans body, Geist Mono mono, Newsreader italic for claim preview only.

UI-SPEC locked component picks:
- `react-resizable-panels`: `<PanelGroup direction="horizontal">` outer, `<PanelGroup direction="vertical">` right column
- `@tanstack/react-virtual`: useVirtualizer over words[] with estimateSize 28
- `@next/third-parties/google` → `YouTubeEmbed`
- shadcn: `tabs`, `select`, `textarea`, `checkbox`, `tooltip`, `badge`, `form`, `toast`, `dialog`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Hard-block keyword util + extend curate schemas with approveClipSchema (ADMN-05/06/15)</name>
  <files>
    apps/web/lib/curate/hardBlockKeywords.ts,
    apps/web/lib/curate/hardBlockKeywords.test.ts,
    apps/web/app/actions/curate/schemas.ts
  </files>
  <read_first>
    - apps/web/app/actions/curate/schemas.ts (Plan 03 — extend, do not replace existing addPodcastSchema / ingestUrlSchema)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pitfall 5 Hard-block keyword denylist" + §"Code Examples — Approval with hard-block"
    - .planning/phases/02-curation-tooling-doac-corpus/02-CONTEXT.md §"GA6" + locked decisions ADMN-05/06/15
  </read_first>
  <behavior>
    hardBlockKeywords.test.ts:
      - Test 1: matchesHardBlock("take 500mg of magnesium glycinate at bedtime") returns object with kind='dosing' and matched pattern
      - Test 2: matchesHardBlock("Dr X recommends getting 7 hours of sleep") returns null (no match)
      - Test 3: matchesHardBlock("ozempic is a glp-1 agonist") returns kind='prescription' with the matched name
      - Test 4: matchesHardBlock("if you have hypertension, see your doctor") returns kind='condition_treatment'
      - Test 5: matchesHardBlock("for most healthy adults") returns null
  </behavior>
  <action>
Create `apps/web/lib/curate/hardBlockKeywords.ts`:
```ts
// ADMN-06 + LGL-08 enforcement.
// Two-layer denylist: prescription drug names + dosing pattern regex + condition-treatment phrases.
// Surface the matched pattern in the error toast so curator sees *why* it blocked.

export type HardBlockHit = {
  kind: 'prescription' | 'dosing' | 'condition_treatment';
  pattern: string;
  match: string;
};

const PRESCRIPTION_NAMES = [
  'ozempic', 'wegovy', 'mounjaro', 'zepbound', 'metformin', 'lisinopril', 'atorvastatin',
  'rosuvastatin', 'levothyroxine', 'amlodipine', 'losartan', 'sertraline', 'fluoxetine',
  'escitalopram', 'bupropion', 'trazodone', 'zolpidem', 'eszopiclone', 'modafinil',
  'adderall', 'ritalin', 'vyvanse', 'xanax', 'klonopin', 'ativan', 'gabapentin',
  'tirzepatide', 'semaglutide', 'liraglutide',
];

const DOSING_RE = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g(?!\w)|ml|iu|units?|tablets?|capsules?|pills?|doses?)\b/i;

const CONDITION_TREATMENT_RE = /\b(?:if you (?:have|are diagnosed with)|treat(?:ing|ment of)?|cure for)\s+(?:hypertension|diabetes|depression|anxiety|insomnia|adhd|cancer|crohn|copd|ibs|migraine|epilepsy)\b/i;

export function matchesHardBlock(text: string): HardBlockHit | null {
  const lower = text.toLowerCase();
  for (const name of PRESCRIPTION_NAMES) {
    if (lower.includes(name)) {
      return { kind: 'prescription', pattern: name, match: name };
    }
  }
  const dose = lower.match(DOSING_RE);
  if (dose) return { kind: 'dosing', pattern: DOSING_RE.source, match: dose[0] };
  const cond = lower.match(CONDITION_TREATMENT_RE);
  if (cond) return { kind: 'condition_treatment', pattern: CONDITION_TREATMENT_RE.source, match: cond[0] };
  return null;
}
```

Append to `apps/web/app/actions/curate/schemas.ts`:
```ts
import { matchesHardBlock } from '@/lib/curate/hardBlockKeywords';

export const approveClipSchema = z.object({
  clipId: z.string().uuid(),
  claim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(4000),
  speaker: z.string().min(1).max(200),
  speakerStatus: speakerStatusEnum,
  domain: domainEnum,
  riskFlags: z.array(riskFlagEnum).min(1, 'risk_flags is mandatory at approval (ADMN-05)'),
  startSec: z.number().min(0),
  endSec: z.number(),
  evidenceStrength: z.enum(['anecdotal', 'observational', 'rct', 'meta_analysis']).optional(),
})
  .refine((d) => d.endSec > d.startSec, { message: 'end must be > start' })
  .refine((d) => !matchesHardBlock(`${d.claim}\n${d.rationale}`), (d) => {
    const hit = matchesHardBlock(`${d.claim}\n${d.rationale}`);
    return {
      message: `Can't publish: this clip touches prescription / dosing / treatment of a diagnosed condition (matched: "${hit?.match}"). See MEDICAL_REVIEW.md.`,
    };
  });

export type ApproveClipInput = z.infer<typeof approveClipSchema>;
```

Create `hardBlockKeywords.test.ts` per behavior block (5 tests).
  </action>
  <verify>
    <automated>pnpm --filter web exec vitest run lib/curate/hardBlockKeywords.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export const approveClipSchema" apps/web/app/actions/curate/schemas.ts` exits 0
    - `grep -q "risk_flags is mandatory at approval" apps/web/app/actions/curate/schemas.ts` exits 0
    - `grep -q "MEDICAL_REVIEW.md" apps/web/app/actions/curate/schemas.ts` exits 0
    - `grep -q "PRESCRIPTION_NAMES" apps/web/lib/curate/hardBlockKeywords.ts` exits 0
    - All 5 hardBlock tests pass
  </acceptance_criteria>
  <done>Denylist util + extended approval schema in place.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: approveClip server action — transaction with hard-block, embed-on-approve, clip_edits write</name>
  <files>
    apps/web/app/actions/curate/approveClip.ts,
    apps/web/app/actions/curate/approveClip.test.ts
  </files>
  <read_first>
    - apps/web/app/actions/curate/schemas.ts (Task 1 — approveClipSchema)
    - apps/web/app/actions/curate/addPodcast.ts (Plan 03 — server action + auth pattern to mirror)
    - packages/db/src/schema/clips.ts + clip-edits.ts (target tables)
    - packages/core/src/embeddings/embedClip.ts (Plan 03 — embedding call)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 2 Embed-on-Approve Server Action"
  </read_first>
  <behavior>
    approveClip.test.ts:
      - Test 1: Happy path with valid input + mock embedClip returns 1536 vector → clip.status='approved', clip.embedding=vector, clipEdits row with action='approved' inserted
      - Test 2: Empty riskFlags → zod rejection, no DB writes
      - Test 3: Claim containing "500mg of magnesium" → zod rejection with MEDICAL_REVIEW.md message
      - Test 4: embedClip throws → clip stays approved (publishedAt set), clipEdits 'embed_failed' row inserted, no exception bubbles to caller (curator sees retry-embed affordance in UI)
      - Test 5: Non-curator session → forbidden error
  </behavior>
  <action>
Create `apps/web/app/actions/curate/approveClip.ts`:
```ts
'use server';
import { db } from '@hdiary/db';
import { clips, clipEdits } from '@hdiary/db/schema';
import { eq } from 'drizzle-orm';
import { embedClip } from '@hdiary/core';
import { getSessionUser } from '@/lib/auth';
import { approveClipSchema, type ApproveClipInput } from './schemas';
import { logger } from '@/lib/logger'; // pino instance from Phase 1; create stub if missing

export async function approveClip(input: ApproveClipInput) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) {
    throw new Error('forbidden: curator or admin role required');
  }
  const parsed = approveClipSchema.parse(input);

  const result = await db.transaction(async (tx) => {
    const [clip] = await tx
      .update(clips)
      .set({
        status: 'approved',
        claim: parsed.claim,
        rationale: parsed.rationale,
        speaker: parsed.speaker,
        speakerStatus: parsed.speakerStatus,
        domain: parsed.domain,
        riskFlags: parsed.riskFlags,
        startSeconds: Math.floor(parsed.startSec),
        endSeconds: Math.ceil(parsed.endSec),
        approvedAt: new Date(),
        approvedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(clips.id, parsed.clipId))
      .returning();
    if (!clip) throw new Error(`clip ${parsed.clipId} not found`);

    await tx.insert(clipEdits).values({
      clipId: clip.id,
      actorId: user.id,
      source: 'manual',
      field: 'status',
      action: 'approved',
      payload: { riskFlags: parsed.riskFlags, evidenceStrength: parsed.evidenceStrength ?? null },
      beforeValue: { status: 'pending' },
      afterValue: { status: 'approved' },
      accepted: true,
    });

    return clip;
  });

  // Embed-on-approve (ADMN-04). Tolerant of OpenAI transient failures — clip stays approved.
  try {
    const vector = await embedClip({ claim: result.claim, rationale: result.rationale });
    await db.update(clips).set({ embedding: vector }).where(eq(clips.id, result.id));
    await db.insert(clipEdits).values({
      clipId: result.id,
      actorId: user.id,
      source: 'manual',
      field: 'embedding',
      action: 'embedded',
      payload: { dim: vector.length, model: 'text-embedding-3-small' },
    });
  } catch (err) {
    logger.warn({ err, clipId: result.id }, 'embed-on-approve failed; clip published, embedding deferred');
    await db.insert(clipEdits).values({
      clipId: result.id,
      actorId: user.id,
      source: 'manual',
      field: 'embedding',
      action: 'embed_failed',
      payload: { error: String((err as Error).message ?? err) },
    });
  }

  return result;
}
```

If `@/lib/logger` does not exist, create `apps/web/lib/logger.ts` minimal:
```ts
import pino from 'pino';
export const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });
```

Create `approveClip.test.ts` per behavior block (5 tests). Mock `@hdiary/core` for `embedClip` and `@/lib/auth` for getSessionUser; mock `@hdiary/db` for `db.transaction` / `db.update` / `db.insert`. Use the same mocking pattern as `addPodcast.test.ts` from Plan 03.
  </action>
  <verify>
    <automated>pnpm --filter web exec vitest run app/actions/curate/approveClip.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "'use server'" apps/web/app/actions/curate/approveClip.ts` exits 0
    - `grep -q "db.transaction" apps/web/app/actions/curate/approveClip.ts` exits 0
    - `grep -q "embedClip" apps/web/app/actions/curate/approveClip.ts` exits 0
    - `grep -q "action: 'embed_failed'" apps/web/app/actions/curate/approveClip.ts` exits 0
    - All 5 approveClip tests pass
  </acceptance_criteria>
  <done>Approval transactional, embed-tolerant, audit-logged. Hard-block enforced before any DB write.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: AI co-pilot — schemas, prompts, streamCopilotObject helper, route handler, similarity check, copilot action</name>
  <files>
    packages/core/src/llm/copilot/schemas.ts,
    packages/core/src/llm/copilot/prompts.ts,
    packages/core/src/llm/copilot/index.ts,
    packages/core/src/llm/grounding/similarityCheck.ts,
    packages/core/src/llm/grounding/similarityCheck.test.ts,
    apps/web/app/api/admin/copilot/stream/route.ts,
    apps/web/app/actions/curate/copilot.ts,
    apps/web/app/actions/curate/copilot.test.ts
  </files>
  <read_first>
    - packages/core/src/llm/anthropic.ts + provider.ts + registry.ts (wrapper pattern — Plan 04 adds streamObject helper here)
    - packages/db/src/schema/clip-edits.ts (ADMN-11 audit shape from Plan 01)
    - packages/db/src/schema/transcript-chunks.ts (for similarity query target)
    - apps/web/app/actions/curate/schemas.ts (existing schemas + add copilotAcceptSchema / copilotRejectSchema)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pattern 3 AI Co-pilot Streaming" + §"AI suggestion zod schemas" + §"AION-10 production grounding check" + §"Pattern 7 clip_edits.payload"
  </read_first>
  <behavior>
    similarityCheck.test.ts:
      - Test 1: Given mocked embedding result + mocked db.execute returning [{similarity: 0.92}], groundingCheck returns 0.92
      - Test 2: Empty result → returns 0
    copilot.test.ts:
      - Test 1: acceptSuggestion writes a clip_edits row with action='ai_accepted', payload contains kind + suggestion + similarity
      - Test 2: rejectSuggestion writes a clip_edits row with action='ai_rejected'
      - Test 3: Non-curator session → forbidden
  </behavior>
  <action>
Create `packages/core/src/llm/copilot/schemas.ts`:
```ts
import { z } from 'zod';

export const suggestStartEndSchema = z.object({
  startSec: z.number().min(0),
  endSec: z.number(),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string().min(1),
});

export const refineClaimSchema = z.object({
  refinedClaim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string().min(1),
});

export const proposeAlternativeSchema = z.object({
  alternativeClaim: z.string().min(10).max(2000),
  rationale: z.string().min(10).max(500),
  quotedSpan: z.string().min(1),
});

export const copilotKindSchema = z.enum(['suggest-start-end', 'refine-claim', 'propose-alternative']);
export type CopilotKind = z.infer<typeof copilotKindSchema>;

export const copilotSchemaByKind = {
  'suggest-start-end': suggestStartEndSchema,
  'refine-claim': refineClaimSchema,
  'propose-alternative': proposeAlternativeSchema,
} as const;
```

Create `packages/core/src/llm/copilot/prompts.ts` — three concise system prompts (≤200 words each) per UI-SPEC voice spec, all instructing the model to ground every suggestion in the provided transcript span and to return the `quotedSpan` it relied on. Templates:
```ts
export const suggestStartEndSystemPrompt = `You are a curation co-pilot for a health-podcast-clip operationalization app. The curator is selecting a 30–120s span from a podcast transcript to extract a single, evidence-backed claim. Given the current selection, propose refined startSec / endSec that (a) preserve the claim, (b) exclude sponsor reads, (c) include any qualifier the speaker attached to the claim. Always return the quotedSpan you grounded the suggestion in. Never invent claims not present in the transcript.`;

export const refineClaimSystemPrompt = `You are a curation co-pilot. Refine the curator's claim text so it is (a) a single declarative sentence, (b) faithful to the transcript span, (c) free of marketing voice, (d) ≤200 chars when possible. Return refinedClaim, a short rationale, and the quotedSpan you grounded it in.`;

export const proposeAlternativeSystemPrompt = `You are a curation co-pilot. Propose an alternative claim wording the curator can A/B against the current one. The alternative must be (a) grounded in the same transcript span, (b) substantively different in framing (active vs implementation-intention vs benefit-first), (c) free of medical-advice voice. Return alternativeClaim, rationale, and the quotedSpan.`;
```

Create `packages/core/src/llm/copilot/index.ts` — exports schemas, prompts, and a `streamCopilotObject(opts)` helper that uses Vercel AI SDK 5 `streamObject` with the Anthropic provider from the wrapper:
```ts
export * from './schemas';
export * from './prompts';

import { streamObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { CopilotKind } from './schemas';
import { copilotSchemaByKind } from './schemas';
import { suggestStartEndSystemPrompt, refineClaimSystemPrompt, proposeAlternativeSystemPrompt } from './prompts';

const PROMPT_BY_KIND: Record<CopilotKind, string> = {
  'suggest-start-end': suggestStartEndSystemPrompt,
  'refine-claim': refineClaimSystemPrompt,
  'propose-alternative': proposeAlternativeSystemPrompt,
};

export type StreamCopilotInput = {
  kind: CopilotKind;
  userPrompt: string;
  temperature?: number;
  onFinish?: (args: { object: unknown }) => void | Promise<void>;
};

export function streamCopilotObject(input: StreamCopilotInput) {
  if (!process.env['ANTHROPIC_API_KEY']) throw new Error('ANTHROPIC_API_KEY required');
  const anthropic = createAnthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
  return streamObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: copilotSchemaByKind[input.kind],
    system: PROMPT_BY_KIND[input.kind],
    prompt: input.userPrompt,
    temperature: input.temperature ?? (input.kind === 'propose-alternative' ? 0.5 : 0.2),
    onFinish: input.onFinish,
  });
}
```

Create `packages/core/src/llm/grounding/similarityCheck.ts`:
```ts
import { sql } from 'drizzle-orm';
import { db } from '@hdiary/db';
import { getEmbeddings } from '../registry';

export async function groundingCheck(quotedSpan: string, clipId: string): Promise<number> {
  const provider = getEmbeddings();
  const { embeddings } = await provider.embed({ input: [quotedSpan] });
  const vec = embeddings[0];
  if (!vec) return 0;
  const rows = await db.execute<{ similarity: number }>(sql`
    SELECT 1 - (embedding <=> ${vec}::vector) AS similarity
    FROM transcript_chunks
    WHERE episode_id = (SELECT episode_id FROM clips WHERE id = ${clipId})
    ORDER BY embedding <=> ${vec}::vector
    LIMIT 1
  `);
  return rows[0]?.similarity ?? 0;
}

export const GROUNDING_THRESHOLD = 0.85;
```

Create `similarityCheck.test.ts` (2 tests) with mocked `db.execute` and mocked embeddings.

Create `apps/web/app/api/admin/copilot/stream/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { db } from '@hdiary/db';
import { clipEdits } from '@hdiary/db/schema';
import { streamCopilotObject, copilotKindSchema } from '@hdiary/core/llm/copilot';
import { groundingCheck, GROUNDING_THRESHOLD } from '@hdiary/core/llm/grounding/similarityCheck';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';

const inputSchema = z.object({
  clipId: z.string().uuid(),
  kind: copilotKindSchema,
  selection: z.string().min(1),     // selected transcript text
  freeText: z.string().optional(),  // curator's question
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  }
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { clipId, kind, selection, freeText } = parsed.data;
  const userPrompt = freeText ? `${selection}\n\nCurator question: ${freeText}` : selection;

  const result = streamCopilotObject({
    kind,
    userPrompt,
    onFinish: async ({ object }) => {
      const obj = object as { quotedSpan: string };
      const similarity = obj?.quotedSpan ? await groundingCheck(obj.quotedSpan, clipId) : 0;
      await db.insert(clipEdits).values({
        clipId,
        actorId: user.id,
        source: 'ai_copilot',
        field: kind,
        action: 'ai_suggested',
        payload: {
          kind,
          suggestion: object,
          similarity,
          belowThreshold: similarity < GROUNDING_THRESHOLD,
          freeText: freeText ?? null,
        },
      });
    },
  });
  return result.toTextStreamResponse();
}
```

Create `apps/web/app/actions/curate/copilot.ts`:
```ts
'use server';
import { db } from '@hdiary/db';
import { clipEdits } from '@hdiary/db/schema';
import { getSessionUser } from '@/lib/auth';
import { z } from 'zod';
import { copilotKindSchema } from '@hdiary/core/llm/copilot';

const acceptSchema = z.object({
  clipId: z.string().uuid(),
  kind: copilotKindSchema,
  suggestion: z.record(z.unknown()),
  similarity: z.number().nullable().optional(),
});

const rejectSchema = acceptSchema.extend({ reason: z.string().optional() });

export async function acceptCopilotSuggestion(input: z.infer<typeof acceptSchema>) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) throw new Error('forbidden');
  const parsed = acceptSchema.parse(input);
  await db.insert(clipEdits).values({
    clipId: parsed.clipId,
    actorId: user.id,
    source: 'ai_copilot',
    field: parsed.kind,
    action: 'ai_accepted',
    payload: { kind: parsed.kind, suggestion: parsed.suggestion, similarity: parsed.similarity ?? null },
    accepted: true,
  });
}

export async function rejectCopilotSuggestion(input: z.infer<typeof rejectSchema>) {
  const user = await getSessionUser();
  if (!user || !['curator', 'admin'].includes(user.role)) throw new Error('forbidden');
  const parsed = rejectSchema.parse(input);
  await db.insert(clipEdits).values({
    clipId: parsed.clipId,
    actorId: user.id,
    source: 'ai_copilot',
    field: parsed.kind,
    action: 'ai_rejected',
    payload: { kind: parsed.kind, suggestion: parsed.suggestion, similarity: parsed.similarity ?? null, reason: parsed.reason ?? null },
    accepted: false,
  });
}
```

Create `copilot.test.ts` (3 tests) using the same mocking pattern as approveClip.test.ts.
  </action>
  <verify>
    <automated>pnpm --filter @hdiary/core exec vitest run llm/grounding/ && pnpm --filter web exec vitest run app/actions/curate/copilot.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `grep -q "export const copilotSchemaByKind" packages/core/src/llm/copilot/schemas.ts` exits 0
    - `grep -q "streamObject" packages/core/src/llm/copilot/index.ts` exits 0
    - `grep -q "GROUNDING_THRESHOLD = 0.85" packages/core/src/llm/grounding/similarityCheck.ts` exits 0
    - `grep -q "action: 'ai_suggested'" apps/web/app/api/admin/copilot/stream/route.ts` exits 0
    - `grep -q "action: 'ai_accepted'" apps/web/app/actions/curate/copilot.ts` exits 0
    - `grep -q "action: 'ai_rejected'" apps/web/app/actions/curate/copilot.ts` exits 0
    - All copilot + similarityCheck tests pass
  </acceptance_criteria>
  <done>Streaming co-pilot endpoint with audit-on-finish, accept/reject actions, AION-10 cosine check wired.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Build the three-pane editor surface — transcript pane, player pane, metadata tab, copilot tab + page shell</name>
  <files>
    apps/web/app/(admin)/curate/editor/[clipId]/page.tsx,
    apps/web/app/(admin)/curate/_components/editor/ThreePanePanels.tsx,
    apps/web/app/(admin)/curate/_components/editor/TranscriptPane.tsx,
    apps/web/app/(admin)/curate/_components/editor/PlayerPane.tsx,
    apps/web/app/(admin)/curate/_components/editor/MetadataTab.tsx,
    apps/web/app/(admin)/curate/_components/editor/CopilotTab.tsx,
    apps/web/app/(admin)/curate/_components/copilot/SuggestionCard.tsx,
    apps/web/app/(admin)/curate/_components/copilot/DiffView.tsx,
    apps/web/app/(admin)/curate/_components/copilot/AION10Badge.tsx,
    apps/web/app/(admin)/curate/_components/editor/MetadataTab.test.tsx,
    apps/web/app/(admin)/curate/_components/editor/TranscriptPane.test.tsx
  </files>
  <read_first>
    - apps/web/app/(admin)/admin/page.tsx + layout.tsx (existing admin shell pattern — typography, Newsreader font, --color-ink-3 reference)
    - apps/web/components.json (shadcn config — components/ui/* will exist after Plan 01 Task 4)
    - .planning/phases/02-curation-tooling-doac-corpus/02-UI-SPEC.md §"Surface-Specific Layout Contracts" #2 and #3, §"Typography", §"Color", §"Copywriting Contract"
    - .planning/UI-DESIGN.md (warm-paper-sage tokens — read § Color tokens and § Typography)
    - .planning/phases/02-curation-tooling-doac-corpus/02-RESEARCH.md §"Pitfall 7 timestamp drift" + §"Pitfall 11 selection state on scroll"
  </read_first>
  <behavior>
    MetadataTab.test.tsx (RTL component):
      - Test 1: Renders all required fields: claim textarea, rationale textarea, speaker input, speakerStatus radios (3), domain radios (4), riskFlags checkboxes (4), evidenceStrength select, startSec / endSec number inputs
      - Test 2: Renders the inline ADMN-15 hint string "Length: as detailed as needed to convey the claim, not more." below the claim field
      - Test 3: Submitting with empty riskFlags shows an inline error "risk_flags is mandatory"
      - Test 4: Submitting valid input calls the provided onSubmit prop with parsed values
    TranscriptPane.test.tsx (RTL component):
      - Test 1: Click on a word sets selectionStartWordIndex; shift+click on a later word sets selectionEndWordIndex
      - Test 2: Selecting yields a "selection chip" showing HH:MM:SS → HH:MM:SS · duration
      - Test 3: Pressing `[` calls onSetStart with current word's start; `]` calls onSetEnd
      - Test 4: Pressing `←` and `→` calls onNudge(-0.5) / onNudge(0.5)
  </behavior>
  <action>
1) `page.tsx` (server component shell): loads clip + transcript words + episode by clipId (Drizzle), passes props to `<ThreePanePanels>`. Curator role gate at top — redirect to /admin if not curator. Use `getSessionUser()`.

2) `ThreePanePanels.tsx` (client component): uses `react-resizable-panels` (PanelGroup horizontal: left=TranscriptPane / right=vertical-PanelGroup with PlayerPane on top, Tabs on bottom). aria-labels on resize handles per UI-SPEC §"Accessibility".

3) `TranscriptPane.tsx` (client): virtualized via `useVirtualizer({ count: words.length, estimateSize: () => 28, overscan: 80 })`. Each word renders 14px Geist Sans, hover bg `--color-paper-3`, selected range bg `--color-accent-soft`. Stores `selectionStartIndex` / `selectionEndIndex` in parent component state (Pitfall 11). Keyboard handler: `[` `]` `space` `←` `→`. Floating "selection chip" at pane top with `00:42:18 → 00:43:55 · 1:37` in 12px Geist Mono. Search input (12px Geist Mono placeholder "find a phrase…") posts to `/api/admin/transcripts/search` (out of scope this plan — render but disabled with tooltip "search lands in 02-05").

4) `PlayerPane.tsx`: `<YouTubeEmbed videoid={youtubeVideoId} params={`start=${start}`} />` from `@next/third-parties/google`. Forwards `key` re-mount on selection change so player re-seeks (Phase 2 simplification — Phase 3 will use the imperative player API).

5) `MetadataTab.tsx`: `react-hook-form` with `zodResolver(approveClipSchema.omit({clipId:true}))` ; submits via Server Action `approveClip`. Newsreader-italic claim preview block (16px / 1.5 / `--color-paper-2` background / `--color-accent-deep` text) renders to the right of the claim textarea. Inline hint below claim: 12px Geist Mono `--color-ink-3` "Length: as detailed as needed to convey the claim, not more." Sticky footer with `Save draft` (ghost) + status-aware primary `Approve & publish` (sage bg).

6) `CopilotTab.tsx`: three preset buttons (Suggest start/end · Refine claim · Propose alternative phrasing) + free-text input + suggestion list rendered as `<SuggestionCard>` newest-first. POSTs to `/api/admin/copilot/stream` and uses Vercel AI SDK's `experimental_useObject` (or `useObject`) hook to render partial-object streaming. Accept button disabled until stream complete (Pitfall 4). Accept/Reject call `acceptCopilotSuggestion` / `rejectCopilotSuggestion` server actions and emit a 12px Geist Mono toast.

7) `SuggestionCard.tsx`: 12px Geist Mono `AI SUGGESTION` eyebrow + `HH:MM:SS` timestamp + `<AION10Badge similarity={x} />` (renders only when similarity < 0.85, copy "⚠ may be unsupported" in `--color-warn` with Radix tooltip per UI-SPEC). Body: `<DiffView before={...} after={...} mode={kind === 'refine-claim' ? 'word' : 'line'} />`. Action row: ghost `Discard` left, primary `Apply suggestion` right.

8) `DiffView.tsx`: uses `diff.diffWords()` for word mode and `diff.diffLines()` for line mode. Removed parts render strikethrough `--color-ink-4`; added parts render `--color-accent-soft` bg with `--color-accent-deep` left-border 2px.

9) `AION10Badge.tsx`: small 12px Geist Sans 400 badge "⚠ may be unsupported" in `--color-warn`; Radix tooltip on hover with copy from UI-SPEC §"AION-10 grounding badge".

10) Test files use RTL + `userEvent`. Pattern: render the component with mock props, assert via `screen.getByRole('textbox', {name:/claim/i})` etc. Skip the virtualizer in tests by mocking `@tanstack/react-virtual` to return all items rendered.

All colors via CSS variables (no hex literals). All sizes match the 4-size scale (24 / 16 / 14 / 12). No emoji except the ⚠ in the AION badge (allowed per UI-SPEC).
  </action>
  <verify>
    <automated>pnpm --filter web exec vitest run app/\(admin\)/curate/_components/editor/ && pnpm --filter web exec tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - All 9 component files exist
    - `grep -q "PanelGroup" apps/web/app/\(admin\)/curate/_components/editor/ThreePanePanels.tsx` exits 0
    - `grep -q "useVirtualizer" apps/web/app/\(admin\)/curate/_components/editor/TranscriptPane.tsx` exits 0
    - `grep -q "YouTubeEmbed" apps/web/app/\(admin\)/curate/_components/editor/PlayerPane.tsx` exits 0
    - `grep -q "Length: as detailed as needed to convey the claim, not more." apps/web/app/\(admin\)/curate/_components/editor/MetadataTab.tsx` exits 0
    - `grep -q "approveClip" apps/web/app/\(admin\)/curate/_components/editor/MetadataTab.tsx` exits 0
    - `grep -q "diffWords" apps/web/app/\(admin\)/curate/_components/copilot/DiffView.tsx` exits 0
    - `grep -q "may be unsupported" apps/web/app/\(admin\)/curate/_components/copilot/AION10Badge.tsx` exits 0
    - MetadataTab + TranscriptPane RTL tests pass
    - `tsc --noEmit` exits 0 for apps/web
  </acceptance_criteria>
  <done>Editor surface compiles, renders, and is wired to approveClip + copilot endpoints with UI-SPEC tokens.</done>
</task>

</tasks>

<verification>
- `pnpm --filter web exec vitest run app/actions/curate/ app/(admin)/curate/ lib/curate/` exits 0
- `pnpm --filter @hdiary/core exec vitest run llm/` exits 0
- `pnpm --filter web exec tsc --noEmit` exits 0
- Manual smoke (deferred to Plan 05 board): seed one pending clip, navigate to `/curate/editor/[clipId]`, three-pane workspace renders with virtualized transcript and `<YouTubeEmbed>`
</verification>

<success_criteria>
1. Three-pane editor renders with transcript / player / tabbed metadata+copilot surfaces per UI-SPEC.
2. Approval is transactional, hard-blocks prescription/dosing/condition clips with curator-readable error.
3. Embed-on-approve writes a 1536-dim vector or audit-logs `embed_failed` without rolling back approval.
4. Each co-pilot suggestion writes one `clip_edits` row with payload.kind/suggestion/similarity; each accept/reject writes a second row.
5. AION-10 grounding badge renders when similarity < 0.85.
6. ADMN-15 length-hint string renders verbatim below the claim field.
</success_criteria>

<output>
After completion, create `.planning/phases/02-curation-tooling-doac-corpus/02-04-SUMMARY.md`.
</output>
