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

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of full onboarding flow</name>
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
  <resume-signal>Type "approved" or describe issues (e.g. "chips wrap awkwardly on mobile", "free-text appears for opted-out user")</resume-signal>
  <action>Pause for human verification. Follow the steps in &lt;how-to-verify&gt;; do not proceed until the user responds with the resume-signal.</action>
  <verify>Human confirms each step of &lt;how-to-verify&gt; passes; reports issues otherwise.</verify>
  <done>User types "approved" (or "approved + loom recorded ..." for the Loom step) and Claude resumes execution.</done>
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
