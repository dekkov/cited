---
phase: 03-user-ai-loop-the-demo
plan: 04
type: execute
wave: 2
depends_on: ["03-01", "03-03"]
files_modified:
  - apps/web/app/(onboarding)/onboarding/interview/page.tsx
  - apps/web/app/(onboarding)/onboarding/interview/_components/InterviewClient.tsx
  - apps/web/app/(onboarding)/onboarding/interview/_components/ProgressDots.tsx
  - apps/web/app/(onboarding)/onboarding/interview/_components/ChoiceChips.tsx
  - apps/web/app/(onboarding)/onboarding/interview/_components/DomainBadge.tsx
  - apps/web/app/(onboarding)/onboarding/interview/_components/SynthesisLoader.tsx
  - apps/web/app/(onboarding)/onboarding/interview/_components/TellMeMore.tsx
  - apps/web/app/(onboarding)/onboarding/recommendations/page.tsx
  - apps/web/app/(onboarding)/onboarding/recommendations/_components/RecommendationStack.tsx
  - apps/web/app/(onboarding)/onboarding/recommendations/_components/HabitCandidateCard.tsx
  - apps/web/app/(onboarding)/onboarding/recommendations/_components/AdoptionSummary.tsx
  - apps/web/app/settings/_components/ReRunInterviewButton.tsx
autonomous: false
requirements:
  - AION-01
  - AION-02
  - AION-07
  - REC-05
  - REC-06
user_setup: []
must_haves:
  truths:
    - "User can start interview from /onboarding/interview; UI uses AI SDK v6 useChat with DefaultChatTransport"
    - "Each turn renders 3–4 chips (D-01); if profile.consentFreeTextAi=true, a textarea appears below; otherwise hidden"
    - "Progress dots at top + domain badge highlighting priority domain after turn 3 (D-02)"
    - "Synthesis flow: 'Analyzing…' loader → 'Tell me more' textarea (free-text gated by AUTH-05c) → swipe stack (D-03)"
    - "Swipe stack: right=adopt, left=skip; confetti/check on adopt; final summary screen (D-04, D-05, D-06)"
    - "Adopting commits user_habits rows via finalize-interview server action then redirects to /dashboard"
    - "Settings has 'Re-run interview' button (REC-06) — calls startInterviewAction and redirects"
    - "UI follows .planning/UI-DESIGN.md tokens (warm paper, Newsreader/Geist), uses <YouTubeEmbed> for clip thumbnails (HAB-04 prep)"
  artifacts:
    - path: "apps/web/app/(onboarding)/onboarding/interview/page.tsx"
      provides: "Server component that ensures a run exists then renders InterviewClient"
      contains: "startInterviewAction"
    - path: "apps/web/app/(onboarding)/onboarding/interview/_components/InterviewClient.tsx"
      provides: "Streaming chat surface (chips-only, no bubble mode)"
      contains: "useChat"
    - path: "apps/web/app/(onboarding)/onboarding/recommendations/_components/RecommendationStack.tsx"
      provides: "Swipe stack (D-04..D-06)"
      contains: "RecommendationStack"
  key_links:
    - from: "InterviewClient"
      to: "/api/interview"
      via: "DefaultChatTransport"
      pattern: "DefaultChatTransport"
    - from: "recommendations/page.tsx"
      to: "/api/synthesize"
      via: "fetch on mount with runId"
      pattern: "fetch.*synthesize"
    - from: "AdoptionSummary"
      to: "finalize-interview server action"
      via: "form action prop"
      pattern: "finalizeInterviewAction"
---

<objective>
Build the onboarding UI: interview surface (chips, progress, domain badge, optional free-text textarea), synthesis loader, "tell me more" step, and the swipe-stack recommendation adoption flow. UI follows `.planning/UI-DESIGN.md` strictly.

Purpose: This is the *demoable* surface — Loom-recordable demo flows through these screens.

Output: Two pages, ~7 components, one settings button. Visual checkpoint at the end.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/UI-DESIGN.md
@.planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md
@.planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md
@apps/web/app/(onboarding)/layout.tsx
@apps/web/components/ui/card.tsx
@apps/web/components/ui/button.tsx
@apps/web/components/ui/badge.tsx
@apps/web/components/ui/dialog.tsx

<interfaces>
From Plan 03-03:
- `POST /api/interview` — AI SDK v6 streaming endpoint; request body `{ messages: UIMessage[], runId, turnCount, domainCoverage, userDoneSignal }`
- `POST /api/synthesize` — `{ runId, structuredAnswers, tellMeMoreFreeText?, retrievedClipIds }` → `{ candidates, profile, droppedCitations }`
- Server actions: `startInterviewAction(): { runId, runIndex }`, `finalizeInterviewAction(acceptedCandidates: HabitCandidate[]): void`
- AI SDK v6 client: `useChat` from `@ai-sdk/react`, `DefaultChatTransport` from `ai`
- `UIMessage.parts[]` array — each part has `.type` ('text' | 'tool-fetch_relevant_clips' | etc.) and `.state`

From Plan 03-01 schemas (`@cited/core`):
- `InterviewTurnOutputSchema` — questionText, choices[], domain?, citedClipIds[], doneSignal
- `HabitCandidate`, `Citation`

UI tokens from UI-DESIGN.md:
- Colors: `--color-paper` (#F4EFE6), `--color-paper-2`, `--color-paper-3`, `--color-ink`, `--color-ink-3`, `--color-accent` (sage), `--color-accent-deep`
- Fonts: Newsreader (headings, claim italic), Geist Sans (UI body), Geist Mono (timestamps, eyebrows)
- Card radii: `--radius-xl` (24px) for habit cards, `--radius-lg` (16px) for interior blocks
- Habit card has three modes: hero (200px player), inline (140px player), collapsed (single row)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Interview surface — page + InterviewClient + chips + progress + domain badge + free-text gate</name>
  <read_first>
    - .planning/UI-DESIGN.md (color tokens, typography, spacing)
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-01, D-02, D-03
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern 3" (UIMessage.parts shape + InterviewClient example)
    - apps/web/app/(onboarding)/layout.tsx (existing shell, disclaimer footer already on it)
    - apps/web/components/ui/button.tsx + badge.tsx (shadcn primitives)
  </read_first>
  <behavior>
    - Test 1: Server component fetches user, calls startInterviewAction if no in-progress run; renders InterviewClient with runId
    - Test 2: When `freeTextOptIn=false`, the textarea below chips is NOT rendered (AUTH-05c)
    - Test 3: When `freeTextOptIn=true`, textarea IS rendered; submitting includes its content in the request body
    - Test 4: ProgressDots renders N dots (N = MAX_TURNS = 10); the active dot is the current turn
    - Test 5: DomainBadge shows "Focusing on: {domain}" only after turn 3 when priorityDomain is set
  </behavior>
  <action>
    1. `apps/web/app/(onboarding)/onboarding/interview/page.tsx` (Server Component):

       ```tsx
       import { startInterviewAction } from '@/app/actions/start-interview';
       import { InterviewClient } from './_components/InterviewClient';
       import { getDb } from '@/lib/db';
       import { getSessionUser } from '@/lib/auth';

       export default async function InterviewPage() {
         const user = await getSessionUser();
         if (!user) redirect('/login');
         const db = getDb();
         const profile = await db.query.profiles.findFirst({ where: (p, { eq }) => eq(p.userId, user.id) });
         const freeTextOptIn = profile?.consentFreeTextAi === true;

         // Find in-progress run; if none, start one
         const existing = await db.query.interviewRuns.findFirst({
           where: (r, { eq, and, isNull }) => and(eq(r.userId, user.id), isNull(r.completedAt)),
           orderBy: (r, { desc }) => desc(r.runIndex),
         });
         const { runId } = existing ? { runId: existing.id } : await startInterviewAction();

         return <InterviewClient runId={runId} freeTextOptIn={freeTextOptIn} />;
       }
       ```

    2. `_components/InterviewClient.tsx` (client component):

       ```tsx
       'use client';
       import { useChat } from '@ai-sdk/react';
       import { DefaultChatTransport, type UIMessage } from 'ai';
       import { useState } from 'react';
       import { useRouter } from 'next/navigation';
       import { ProgressDots } from './ProgressDots';
       import { DomainBadge } from './DomainBadge';
       import { ChoiceChips } from './ChoiceChips';
       import { SynthesisLoader } from './SynthesisLoader';
       import { TellMeMore } from './TellMeMore';
       import { InterviewTurnOutputSchema, MAX_TURNS } from '@cited/core';

       type Domain = 'sleep'|'nutrition_gut'|'exercise_longevity'|'mental_health';

       export function InterviewClient({ runId, freeTextOptIn }: { runId: string; freeTextOptIn: boolean }) {
         const router = useRouter();
         const [domainCoverage, setDomainCoverage] = useState<Record<Domain, number>>({ sleep:0, nutrition_gut:0, exercise_longevity:0, mental_health:0 });
         const [structuredAnswers, setStructuredAnswers] = useState<Array<{turn:number; domain?:Domain; question:string; choiceLabel:string; freeText?:string}>>([]);
         const [retrievedClipIds, setRetrievedClipIds] = useState<string[]>([]);
         const [phase, setPhase] = useState<'interview'|'synthesizing'|'tell-me-more'|'done'>('interview');
         const [freeText, setFreeText] = useState('');

         const { messages, sendMessage, status } = useChat({
           transport: new DefaultChatTransport({
             api: '/api/interview',
             body: () => ({ runId, turnCount: structuredAnswers.length, domainCoverage, userDoneSignal: false }),
           }),
         });

         // Parse the latest assistant message's parts to extract a structured InterviewTurnOutput.
         // AI SDK v6 streams tool-result parts with `.type === 'tool-result'` and `.toolName === 'fetch_relevant_clips'`.
         // For the question itself, the model emits a text part with a JSON body matching InterviewTurnOutputSchema.
         const lastAssistant = messages.filter((m) => m.role === 'assistant').at(-1);
         const turnOutput = extractTurnOutput(lastAssistant);  // helper: parses parts array

         if (phase === 'interview' && turnOutput?.doneSignal) {
           setPhase('synthesizing');
         }

         async function onChoiceSelect(choice: { id: string; label: string }) {
           const turn = structuredAnswers.length + 1;
           const newAnswer = {
             turn,
             domain: turnOutput?.domain,
             question: turnOutput?.questionText ?? '',
             choiceLabel: choice.label,
             freeText: freeTextOptIn && freeText.trim() ? freeText : undefined,
           };
           const nextAnswers = [...structuredAnswers, newAnswer];
           setStructuredAnswers(nextAnswers);
           if (turnOutput?.domain) {
             setDomainCoverage((dc) => ({ ...dc, [turnOutput.domain!]: dc[turnOutput.domain!] + 1 }));
           }
           if (turnOutput?.citedClipIds) {
             setRetrievedClipIds((ids) => [...new Set([...ids, ...turnOutput.citedClipIds])]);
           }
           setFreeText('');

           // Send the choice as the user message — AI SDK v6 sendMessage with parts array
           await sendMessage({ text: `Selected: ${choice.label}${newAnswer.freeText ? ` | Note: ${newAnswer.freeText}` : ''}` });

           if (nextAnswers.length >= MAX_TURNS) setPhase('synthesizing');
         }

         if (phase === 'synthesizing') {
           return <SynthesisLoader onComplete={() => setPhase('tell-me-more')} />;
         }
         if (phase === 'tell-me-more') {
           return <TellMeMore allowFreeText={freeTextOptIn} onSubmit={async (text) => {
             // POST /api/synthesize with tellMeMoreFreeText + structuredAnswers + retrievedClipIds
             const res = await fetch('/api/synthesize', {
               method: 'POST',
               body: JSON.stringify({ runId, structuredAnswers, tellMeMoreFreeText: text || undefined, retrievedClipIds }),
             });
             if (!res.ok) throw new Error('Synthesis failed');
             router.push('/onboarding/recommendations?runId=' + runId);
           }} />;
         }

         return (
           <main className="min-h-screen bg-[var(--color-paper)] px-5 py-8">
             <ProgressDots current={structuredAnswers.length} total={MAX_TURNS} />
             {turnOutput?.domain && structuredAnswers.length >= 3 && (
               <DomainBadge domain={turnOutput.domain} />
             )}
             <h2 className="font-newsreader text-2xl mt-6">{turnOutput?.questionText ?? 'Loading…'}</h2>
             {turnOutput?.choices && <ChoiceChips choices={turnOutput.choices} onSelect={onChoiceSelect} />}
             {freeTextOptIn && turnOutput && (
               <textarea
                 className="mt-4 w-full rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 font-sans text-sm"
                 placeholder="Add a note (optional)…"
                 value={freeText}
                 onChange={(e) => setFreeText(e.target.value)}
                 maxLength={500}
               />
             )}
           </main>
         );
       }

       function extractTurnOutput(m: UIMessage | undefined): import('@cited/core').InterviewTurnOutput | null {
         if (!m) return null;
         for (const p of m.parts) {
           if (p.type === 'text') {
             try {
               return InterviewTurnOutputSchema.parse(JSON.parse((p as { text: string }).text));
             } catch { /* fallthrough */ }
           }
         }
         return null;
       }
       ```

    3. `_components/ProgressDots.tsx` — 10 dots, active = sage fill, rest = paper-3.

    4. `_components/DomainBadge.tsx` — pill with "Focusing on: {humanize(domain)}", sage accent border.

    5. `_components/ChoiceChips.tsx` — 3-4 button chips, mono eyebrow label, ink-on-paper, hover lifts 1px.

    6. `_components/SynthesisLoader.tsx` — full-screen "Analyzing your profile…" with Newsreader title + animated sage dot. Calls `onComplete` after `/api/synthesize` returns (handled in TellMeMore). For now: 0.5s skeleton then advance.

    7. `_components/TellMeMore.tsx` — textarea (if `allowFreeText`) labelled exactly per D-03: "Anything else you'd like to share for better recommendations? e.g. eating habits, work schedule, why you developed certain habits". Submit button = primary ink. Skip link below.

    8. Write tests for `extractTurnOutput`, `ProgressDots`, `ChoiceChips`, `TellMeMore` (Vitest + React Testing Library).

    All colors must come from `var(--color-*)` tokens. NO hex codes in components except inside the OG image route.
  </action>
  <verify>
    <automated>pnpm --filter @cited/web typecheck &amp;&amp; pnpm --filter @cited/web test -- interview</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/app/\(onboarding\)/onboarding/interview/page.tsx`
    - `test -f apps/web/app/\(onboarding\)/onboarding/interview/_components/InterviewClient.tsx`
    - `grep -q "useChat" apps/web/app/\(onboarding\)/onboarding/interview/_components/InterviewClient.tsx` returns 0
    - `grep -q "DefaultChatTransport" apps/web/app/\(onboarding\)/onboarding/interview/_components/InterviewClient.tsx` returns 0
    - `grep -q "freeTextOptIn" apps/web/app/\(onboarding\)/onboarding/interview/_components/InterviewClient.tsx` returns 0
    - `grep -q "Focusing on:" apps/web/app/\(onboarding\)/onboarding/interview/_components/DomainBadge.tsx` returns 0
    - `grep -q "Anything else you'd like to share" apps/web/app/\(onboarding\)/onboarding/interview/_components/TellMeMore.tsx` returns 0
    - `grep -rE "text-red-|bg-red-" apps/web/app/\(onboarding\)/onboarding/interview/` returns 1 (no red — UI-DESIGN.md sage-only palette)
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Interview UI streams from /api/interview, renders chips, gates free-text on AUTH-05c, shows progress + priority domain.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Recommendations page + RecommendationStack swipe + AdoptionSummary + settings re-run button</name>
  <read_first>
    - .planning/phases/03-user-ai-loop-the-demo/03-CONTEXT.md D-04, D-05, D-06 (swipe stack spec)
    - .planning/UI-DESIGN.md (Habit Card section — claim italic, speaker name, clip thumbnail rules)
    - apps/web/app/settings/ (existing settings shell — find the right file to add the button)
    - .planning/phases/03-user-ai-loop-the-demo/03-RESEARCH.md §"Pattern" for `<YouTubeEmbed>` from `@next/third-parties/google`
  </read_first>
  <behavior>
    - Test 1: RecommendationStack renders the first candidate; swipe right adopts (calls onAdopt); swipe left skips (calls onSkip); next card slides in
    - Test 2: Confetti/check animation triggers on swipe-right (CSS class added; verifiable via test)
    - Test 3: After all candidates processed, AdoptionSummary renders with the count of adopted habits + "Confirm" button
    - Test 4: Confirm calls finalizeInterviewAction with the adopted-candidate list and redirects to /dashboard
    - Test 5: ReRunInterviewButton calls startInterviewAction and navigates to /onboarding/interview
  </behavior>
  <action>
    1. `apps/web/app/(onboarding)/onboarding/recommendations/page.tsx` (Server Component):
       - Receives `runId` via search params
       - Fetches `interview_runs.candidatesJson` from DB (server-side; RLS scopes to owner)
       - Passes candidates to `<RecommendationStack candidates={...} />`

    2. `_components/RecommendationStack.tsx` (client) — keyboard + pointer + touch swipe:
       ```tsx
       'use client';
       import { useState } from 'react';
       import type { HabitCandidate } from '@cited/core';
       import { HabitCandidateCard } from './HabitCandidateCard';
       import { AdoptionSummary } from './AdoptionSummary';

       export function RecommendationStack({ candidates }: { candidates: HabitCandidate[] }) {
         const [index, setIndex] = useState(0);
         const [adopted, setAdopted] = useState<HabitCandidate[]>([]);
         const [animState, setAnimState] = useState<'idle'|'adopt'|'skip'>('idle');

         if (index >= candidates.length) {
           return <AdoptionSummary adopted={adopted} />;
         }
         const current = candidates[index];

         async function onAdopt() {
           setAnimState('adopt');
           setTimeout(() => {
             setAdopted([...adopted, current]);
             setIndex(index + 1);
             setAnimState('idle');
           }, 500);  // D-05: ~0.5s confetti/check
         }
         function onSkip() {
           setAnimState('skip');
           setTimeout(() => { setIndex(index + 1); setAnimState('idle'); }, 300);
         }

         return (
           <main className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center p-5">
             <HabitCandidateCard candidate={current} animState={animState} onAdopt={onAdopt} onSkip={onSkip} />
           </main>
         );
       }
       ```

    3. `_components/HabitCandidateCard.tsx` — D-06 face spec:
       - Title (Newsreader 24-28px)
       - Claim quote (Newsreader italic 17px) — first citation's claim
       - Domain badge (mono eyebrow)
       - Trigger line (Geist body)
       - Tiny action line (Geist body bold)
       - Clip thumbnail via `<YouTubeEmbed videoid={citation.youtubeVideoId} params="start=...&end=..." />` from `@next/third-parties/google` — tap-to-play, NO autoplay (HAB-05)
       - Speaker name visible (Geist 600)
       - Two action buttons below: "Skip" ghost + "Adopt" primary ink filled
       - Pointer/touch swipe handlers via simple pointermove tracking (no framer-motion dep)
       - `animState='adopt'` applies CSS class `.adopt-animation` (transform translateX 100% + scale-up check overlay)

       Note: We don't yet have the YouTube videoId on Citation — fetch the clip row server-side in the recommendations/page.tsx and inject `videoId` alongside each citation.

    4. `_components/AdoptionSummary.tsx`:
       - Heading "{adopted.length} habits adopted" (Newsreader)
       - List of adopted habit titles
       - Primary button "Continue to dashboard" → calls `finalizeInterviewAction(adopted)` then `router.push('/dashboard')`
       - Ghost link "Start over" → goes to /onboarding/interview

    5. `apps/web/app/settings/_components/ReRunInterviewButton.tsx` (client component using `startInterviewAction`):
       ```tsx
       'use client';
       import { startInterviewAction } from '@/app/actions/start-interview';
       import { useRouter } from 'next/navigation';
       import { Button } from '@/components/ui/button';

       export function ReRunInterviewButton() {
         const router = useRouter();
         return (
           <Button variant="outline" onClick={async () => {
             await startInterviewAction();
             router.push('/onboarding/interview');
           }}>Run interview again</Button>
         );
       }
       ```
       Place it in the existing settings page (find the right file via `ls apps/web/app/settings/`; add to the main settings panel near profile fields).

    6. Write tests for RecommendationStack (RTL + userEvent), AdoptionSummary, ReRunInterviewButton.
  </action>
  <verify>
    <automated>pnpm --filter @cited/web typecheck &amp;&amp; pnpm --filter @cited/web test -- recommendations</automated>
  </verify>
  <acceptance_criteria>
    - `test -f apps/web/app/\(onboarding\)/onboarding/recommendations/page.tsx`
    - `test -f apps/web/app/\(onboarding\)/onboarding/recommendations/_components/RecommendationStack.tsx`
    - `grep -q "YouTubeEmbed" apps/web/app/\(onboarding\)/onboarding/recommendations/_components/HabitCandidateCard.tsx` returns 0
    - `grep -q "autoplay" apps/web/app/\(onboarding\)/onboarding/recommendations/_components/HabitCandidateCard.tsx` returns 1 (no autoplay — HAB-05)
    - `grep -q "finalizeInterviewAction" apps/web/app/\(onboarding\)/onboarding/recommendations/_components/AdoptionSummary.tsx` returns 0
    - `grep -q "startInterviewAction" apps/web/app/settings/_components/ReRunInterviewButton.tsx` returns 0
    - `grep -rE "text-red-|bg-red-|🔥" apps/web/app/\(onboarding\)/` returns 1 (no shame UI)
    - `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Swipe-stack adoption flow + summary + dashboard handoff + REC-06 re-run button all working.</done>
</task>

<task type="checkpoint:human-verify" gate="superseded">
  <name>Task 3 (ORIGINAL — SUPERSEDED 2026-05-17): Visual verification of full onboarding flow</name>
  <supersession-note>
    The streaming/per-turn interview was deleted on 2026-05-17 in favor of a static
    question pool + LLM-ranked selection. Steps below referencing "stream", "turn N",
    "SynthesisLoader", "Tell me more" textarea, and "Focusing on: {domain}" badge no
    longer apply. See **Task 3 (REVISED)** immediately below for the authoritative
    checklist against the current surface.
  </supersession-note>
  <what-built>Interview UI (chips + progress + free-text gate), synthesis loader, "tell me more" textarea, swipe-stack with confetti, adoption summary, settings re-run button.</what-built>
  <how-to-verify>
    1. `pnpm dev` in repo root; visit http://localhost:3000
    2. Sign up + complete consent (with AUTH-05c opted-in for first test)
    3. Visit `/onboarding/interview` — verify: progress dots at top; first question renders with 3–4 chips; textarea below chips
    4. Click a chip — verify next turn loads via stream; chip selection plus optional textarea content sent
    5. After turn 3 — verify "Focusing on: {domain}" badge appears
    6. After 6–10 turns (or `doneSignal`) — verify SynthesisLoader shows "Analyzing your profile…"
    7. After loader — verify "Tell me more" textarea appears with exact prompt text from D-03
    8. Submit "tell me more" — verify redirect to `/onboarding/recommendations`
    9. Verify swipe stack shows first habit candidate with: title, claim italic, domain badge, trigger, tiny action, clip thumbnail (NO autoplay — click play required), speaker name, two action buttons
    10. Swipe right → confetti/check 0.5s animation → next card; swipe left → next card without animation
    11. After all candidates → adoption summary with adopted count
    12. Confirm → redirected to `/dashboard` (dashboard might be empty/stub at this point — that's Plan 03-05)
    13. Sign out, sign back in with AUTH-05c OPT-OUT — verify interview renders WITHOUT textarea (chips only)
    14. Visit `/settings` — verify "Run interview again" button is present; clicking creates a new `interview_runs` row (verifiable via DB inspection) and redirects to interview
    15. Verify NO red colors, NO flame emoji anywhere; all colors from warm-paper + sage palette
  </how-to-verify>
  <resume-signal>n/a — superseded</resume-signal>
  <action>Skipped. Use Task 3 (REVISED) below.</action>
  <verify>n/a — superseded</verify>
  <done>Marked superseded 2026-05-17 by commit 107f381 (pivot to static question pool + OpenAI-only).</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3 (REVISED 2026-05-17): Visual verification of rebuilt onboarding flow</name>
  <what-built>
    Onboarding surface rebuilt post-pivot:
    - Email + password login (sign-up + sign-in toggle) — `apps/web/app/(auth)/login/`
    - Legal/consent gate (unchanged from original spec) — `apps/web/app/(onboarding)/onboarding/legal-gate/`
    - Interview as a single client component `InterviewFlow.tsx` with 4 phases:
      `about-you` → `loading-questions` → `questions` → `submitting`
    - Question pool: `packages/core/src/interview/question-pool.ts` (30 Qs: 6 per domain × 4 + 6 general; 4 chip choices each)
    - LLM selection: `POST /api/interview/select-questions` → GPT-4o-mini ranks 8 of 30, domain-rotation fallback on error
    - Synthesis: `POST /api/synthesize` → embeds free-form + answer labels server-side, runs `hybridRetrieve`, GPT-4o synthesizes habit candidates
    - Recommendations page (unchanged from prior plan): swipe stack + adoption summary + dashboard handoff
    - Settings: REC-06 "Run interview again" button (unchanged)
  </what-built>
  <env-prereqs>
    - `LLM_PROVIDER=openai` exported
    - `OPENAI_API_KEY=sk-...` exported (real key, billable)
    - `DATABASE_URL=postgres://...`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
    - Supabase dashboard → Auth → Email settings → **"Confirm email" DISABLED** (otherwise sign-up cannot reach interview without an inbox)
    - ≥ N approved clips with embeddings present in DB (synthesis needs candidates; if DB is empty, recommendations page will render an empty/error state — note this and continue)
  </env-prereqs>
  <how-to-verify>
    **Setup**
    1. `pnpm dev` from repo root; open http://localhost:3000 in a fresh Chrome incognito window. Keep DevTools → Network + Console open throughout.

    **Auth — sign-up path (AUTH-05c opted in)**
    2. Visit `/login`. Verify the form shows: email input, password input, **"Sign up" / "Sign in" toggle**. No magic-link / OTP UI.
    3. Toggle to "Sign up". Enter a brand-new email + password (≥6 chars). Submit. Verify: no email-confirmation gate; redirect lands on either `/onboarding/legal-gate` or `/onboarding/interview`.
    4. Complete the legal gate: accept disclaimer, enter DOB (≥18), enable **all three** consent toggles including the "AI free-text analysis" one (AUTH-05c). Submit. Verify redirect → `/onboarding/interview`.

    **Interview — phase 1: about-you**
    5. Verify the page heading reads **"Tell us about yourself"** (Newsreader font, not Geist). Helper copy below mentions job/schedule/foods/hobbies.
    6. Verify a `<textarea>` (rows=10, placeholder starting "e.g. I'm a software engineer…") and a character counter "`0 / 4000`" (Geist Mono).
    7. With < 10 characters typed, the **Continue** button is disabled. Type ≥ 10 chars; the button enables.
    8. Click **Continue**.

    **Interview — phase 2: loading-questions**
    9. Verify a transient screen shows italic Newsreader text **"Personalising your questions…"** centered. DevTools Network: expect a `POST /api/interview/select-questions` → 200 within ~1–3s. Inspect response body: `selectedIds: string[]` with **exactly 8 IDs**, `remainingIds: string[]` with the other ~22.
    10. If the API errors (5xx) verify the screen still falls through to phase 3 with a domain-rotation fallback set of 8 questions (no broken state).

    **Interview — phase 3: questions**
    11. Verify the heading **"A few questions for you"** + progress line **"0 of 8 answered."** (Geist Sans).
    12. Each question block renders: zero-padded index ("01", "02", …) in Geist Mono, question text in Newsreader, **4 chip buttons** stacked vertically (Geist Mono, tracking 0.04em).
    13. Click a chip on Q1. Verify: chosen chip gets the sage accent border + paper bg; un-chosen chips keep rule-color border. Progress updates to "1 of 8 answered."
    14. **Because AUTH-05c is opted in:** a per-question `<textarea>` ("Add a note (optional)…") appears below the chips of any question the user has answered. Type a 1-line note on Q1. (No save button — state is in-memory.)
    15. Scroll to the bottom of the 8 questions. Verify a **dashed-border button "Want to go deeper? Show {N} more optional questions"** (where N ≈ 22).
    16. Click the expander. Verify the remaining questions render below with "· optional" appended to their index label. Expander button disappears.
    17. Answer at least 6 of 8 required questions (a couple can stay blank — the button isn't gated on completion).
    18. Bottom of page: verify the counter ("X answered" in Geist Mono) and a **"Generate recommendations"** button.

    **Interview — phase 4: submitting → recommendations**
    19. Click **Generate recommendations**. Verify screen swaps to italic Newsreader **"Analysing your profile…"** centered.
    20. DevTools Network: expect a `POST /api/synthesize` → 200 within ~5–15s. Body sent must be `{ runId, freeFormText, answers: Answer[] }` — **no `retrievedClipIds`** (it's now server-side). Response carries the run + candidates.
    21. Verify redirect to `/onboarding/recommendations?runId=<uuid>`. Swipe stack renders ≥ 1 candidate card with: title, italic claim, domain badge, trigger, tiny action, YouTube **thumbnail (no autoplay)**, speaker name, two action buttons.
    22. Swipe / tap right on the top card. Verify ~0.5s confetti-or-check affirmation animation, then next card. Swipe left = next card with no animation.
    23. After all candidates → adoption summary with adopted count. **Confirm** → lands on `/dashboard` (stub at this point is fine).

    **Auth — sign-in + AUTH-05c opt-out path**
    24. Sign out (header menu or whatever shortcut exists in the dashboard stub). Back at `/login`, toggle to **Sign in**. Use the credentials from step 3. Verify redirect → `/dashboard` (returning user — no re-interview).
    25. Hit `/settings`. Click **"Run interview again"** (REC-06). Verify a new `interview_runs` row inserts (visible via Drizzle Studio or `select * from interview_runs order by created_at desc limit 2`) and the browser redirects back to `/onboarding/interview`.
    26. **Repeat steps 5–9** but in step 13 keep an eye out: with AUTH-05c **previously** opted in, free-text notes still show. **NOTE**: AUTH-05c opt-out re-test is deferred — covered separately by toggling the consent in `/settings` once that surface exists. For this run, just confirm the opt-in behavior is consistent across the second run.

    **Cross-cutting visual rules**
    27. Spot-check across all screens: no `text-red-*` / `bg-red-*` classes, no flame (🔥), no fire-related emoji, no Apple Health red. **EXCEPTION**: the inline error message in `InterviewFlow.tsx` uses `text-red-600` for `role="alert"` copy — this is acceptable per accessibility guidance, but it should only appear on failure.
    28. Fonts: Newsreader on `h1` / `h2` and italic loaders; Geist Sans on body + helper copy; Geist Mono on counters, indices, and chip labels.
    29. Colors come from `--color-paper`, `--color-paper-2`, `--color-ink`, `--color-ink-4`, `--color-rule`, `--color-accent`. Run `grep -rE "text-red-|bg-red-|🔥" apps/web/app/\(onboarding\)/` — expect **1** hit (the alert in InterviewFlow.tsx) per the exception in step 27.
    30. Mobile: Chrome DevTools → 375 × 667. Verify chip buttons don't overflow, textareas keep their padding, expander button wraps cleanly, "Generate recommendations" button stays in view.

    **Console / Network sanity**
    31. Throughout the run, console should be clean of red errors (yellow React-strict-mode warnings tolerable). Network tab should show exactly **one** `select-questions` and **one** `synthesize` call per interview run — no per-turn `/api/interview` traffic (that route is gone).
  </how-to-verify>
  <known-non-blockers>
    - Pre-existing build errors in `apps/web/app/api/admin/ingest/route.ts` and `apps/web/lib/curate/chunking.ts` (refs to removed `@cited/core` exports: `extractVideoId`, `fetchTranscript`, `WordTimestamped`). Not on the onboarding path. Track separately.
    - Dashboard at `/dashboard` may still be a stub (real surface lands in Plan 03-05). Landing there with a stub view is acceptable; "blank dashboard" is not a Task 3 failure.
  </known-non-blockers>
  <resume-signal>
    Type **"approved"** when all blocking steps pass.
    Otherwise describe what broke (e.g. "select-questions returned 9 IDs", "free-text notes appear even though AUTH-05c was off", "synthesis 500'd with OPENAI_API_KEY undefined").
  </resume-signal>
  <action>Pause for human verification. Follow the steps above; do not proceed to Plan 03-05 / 03-06 until the user responds with the resume-signal.</action>
  <verify>Human confirms each blocking step passes; logs issues otherwise.</verify>
  <done>User types "approved"; Claude amends `03-04-onboarding-ui-SUMMARY.md` to record the pivot + final verification result, then advances to Wave 3 (Plans 03-05 + 03-06).</done>
</task>

</tasks>

<verification>
- Full onboarding flow renders without console errors
- AI SDK v6 streaming works (Network tab shows streaming response)
- AUTH-05c gate honored in BOTH directions
- No red colors / flame emojis anywhere
</verification>

<success_criteria>
A new user signs up, completes 6–10 chip-based interview turns, sees synthesis loader, fills "tell me more", swipes through 3–5 candidates, confirms, and lands on /dashboard. REC-06 re-run works from settings.
</success_criteria>

<output>
After completion, create `.planning/phases/03-user-ai-loop-the-demo/03-04-SUMMARY.md` listing: route paths, components, AI SDK v6 patterns used, screenshots referenced from checkpoint.
</output>
