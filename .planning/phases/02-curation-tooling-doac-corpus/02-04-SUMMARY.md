---
phase: 02-curation-tooling-doac-corpus
plan: 04
subsystem: clip-editor
tags: [clip-editor, approve-action, ai-copilot, streaming, grounding, tdd, react-resizable-panels, react-virtual, drizzle, zod, vitest, rtl]
requires:
  - "02-01: clip_edits schema (clip_edit_action enum + payload jsonb + action notNull)"
  - "02-02: transcript fetch orchestrator (words array in transcript.segments)"
  - "02-03: embedClip() + curate schemas (domainEnum/speakerStatusEnum/riskFlagEnum) + @cited/core LLM registry"
  - "Phase 1: getSessionUser() (role-aware), createDb(), is_curator_or_admin RLS"
provides:
  - "hardBlockKeywords.ts — ADMN-06/LGL-08 two-layer denylist (prescription + dosing + condition_treatment)"
  - "approveClipBaseSchema (ZodObject, for zodResolver) + approveClipSchema (ZodEffects, server-side)"
  - "approveClip() server action — transactional approve with hard-block, embed-on-approve, clip_edits audit"
  - "packages/core/src/llm/copilot — copilotSchemaByKind, three system prompts, streamCopilotObject() helper (AION-09 wrapper)"
  - "packages/core/src/llm/grounding/similarityCheck — groundingCheck() + GROUNDING_THRESHOLD=0.85"
  - "POST /api/admin/copilot/stream — streamObject endpoint with onFinish groundingCheck + clip_edits audit"
  - "acceptCopilotSuggestion / rejectCopilotSuggestion server actions"
  - "ThreePanePanels: react-resizable-panels Group/Panel/Separator three-pane workspace"
  - "TranscriptPane: useVirtualizer 28px rows, click/shift-click, [/]/space/left/right keyboard shortcuts"
  - "PlayerPane: YouTubeEmbed with key-remount seek"
  - "MetadataTab: react-hook-form + zodResolver, ADMN-15 length-hint, sticky footer"
  - "CopilotTab: three presets + free-text + streaming suggestion cards"
  - "SuggestionCard / DiffView / AION10Badge: diffWords/diffLines, cosine-below-threshold badge"
  - "editor/[clipId]/page.tsx: server component shell loading clip+episode+transcript"
affects:
  - "02-05 review board: consumes approveClip action + clip_edits audit shape"
  - "02-06 AION-10 fixture: consumes groundingCheck for evals"
  - "Phase 3 onboarding: embedding in clips.embedding available for RAG after approve"
tech-stack:
  added:
    - "@testing-library/user-event ^14.6.1 (workspace root devDep)"
    - "vitest.setup.ts + vitest.d.ts for ResizeObserver polyfill + jest-dom types"
  patterns:
    - "approveClipBaseSchema (ZodObject) + approveClipSchema (ZodEffects) — split prevents zodResolver breakage with .refine()"
    - "embed-on-approve tolerant pattern — clip stays approved even if embedClip() throws; audit row action='embed_failed' surfaces retry affordance"
    - "react-resizable-panels v4.11 API: Group/Panel/Separator (not PanelGroup/PanelResizeHandle)"
    - "RTL test pattern: mock @tanstack/react-virtual to render all items; ResizeObserver polyfill in setup for Radix UI"
    - "AION-10 grounding: caller-injected NearestChunkQuery keeps @cited/core drizzle-orm-free"
key-files:
  created:
    - "apps/web/lib/curate/hardBlockKeywords.ts"
    - "apps/web/lib/curate/hardBlockKeywords.test.ts"
    - "apps/web/app/actions/curate/approveClip.ts"
    - "apps/web/app/actions/curate/approveClip.test.ts"
    - "apps/web/app/actions/curate/copilot.ts"
    - "apps/web/app/actions/curate/copilot.test.ts"
    - "packages/core/src/llm/copilot/schemas.ts"
    - "packages/core/src/llm/copilot/prompts.ts"
    - "packages/core/src/llm/copilot/index.ts"
    - "packages/core/src/llm/grounding/similarityCheck.ts"
    - "packages/core/src/llm/grounding/similarityCheck.test.ts"
    - "apps/web/app/api/admin/copilot/stream/route.ts"
    - "apps/web/app/(admin)/curate/editor/[clipId]/page.tsx"
    - "apps/web/app/(admin)/curate/_components/editor/ThreePanePanels.tsx"
    - "apps/web/app/(admin)/curate/_components/editor/TranscriptPane.tsx"
    - "apps/web/app/(admin)/curate/_components/editor/PlayerPane.tsx"
    - "apps/web/app/(admin)/curate/_components/editor/MetadataTab.tsx"
    - "apps/web/app/(admin)/curate/_components/editor/CopilotTab.tsx"
    - "apps/web/app/(admin)/curate/_components/copilot/SuggestionCard.tsx"
    - "apps/web/app/(admin)/curate/_components/copilot/DiffView.tsx"
    - "apps/web/app/(admin)/curate/_components/copilot/AION10Badge.tsx"
    - "apps/web/app/(admin)/curate/_components/editor/MetadataTab.test.tsx"
    - "apps/web/app/(admin)/curate/_components/editor/TranscriptPane.test.tsx"
    - "vitest.setup.ts"
    - "apps/web/vitest.d.ts"
  modified:
    - "apps/web/app/actions/curate/schemas.ts (added approveClipBaseSchema export)"
    - "vitest.config.ts (added setupFiles)"
    - "package.json + pnpm-lock.yaml (@testing-library/user-event)"
decisions:
  - "approveClipBaseSchema split from approveClipSchema — .refine() wraps ZodObject in ZodEffects; zodResolver requires ZodObject, so base schema exported separately for form use while server action uses the full ZodEffects schema for cross-field + hard-block validation"
  - "react-resizable-panels v4.11 exports Group/Panel/Separator (not PanelGroup/PanelResizeHandle as plan specified) — updated ThreePanePanels.tsx to alias Group as PanelGroup and Separator as PanelResizeHandle to preserve plan intent while using the actual API"
  - "AION-10 grounding: caller-injected NearestChunkQuery pattern (already in similarityCheck.ts from prior executor) — keeps @cited/core drizzle-orm-free; the route handler owns the SQL and passes it in. Plan's inline db.execute pattern adapted accordingly"
  - "embed-on-approve tolerant: embedClip() failure does NOT roll back approval. Clip stays approved, embed_failed audit row inserted, UI surfaced retry affordance note in ThreePanePanels onSubmit toast"
  - "ResizeObserver polyfill in vitest.setup.ts — Radix UI Select (used in MetadataTab) calls ResizeObserver in useEffect; jsdom doesn't provide it. Global stub unblocks RTL tests without requiring heavy workaround"
metrics:
  duration: "~12 min"
  completed: "2026-05-12"
  tasks: 4
  commits: 4
  files: 32
---

# Phase 02 Plan 04: Clip Editor — Three-Pane Workspace + AI Co-Pilot Summary

Built the curator's primary work surface: a server-component page shell loading clip+episode+transcript from Postgres, a react-resizable-panels three-pane workspace (virtualized transcript / sticky YouTubeEmbed player / tabbed metadata+copilot), the `approveClip` server action (transactional approve with hard-block validation + embed-on-approve tolerance), a streaming AI co-pilot route using Vercel AI SDK `streamObject` with AION-10 grounding check on `onFinish`, and accept/reject server actions that write `clip_edits` audit rows. Once this plan is green, a curator can hand-cut + AI-co-pilot clips through `pending → approved` and a 1536-dim vector lands in `clips.embedding`.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Hard-block keyword util + approveClipBaseSchema/approveClipSchema (ADMN-05/06/15, TDD, 5 tests) | `64c2953` | hardBlockKeywords.ts/.test.ts, schemas.ts |
| 2 | approveClip server action — transaction + embed-on-approve + clip_edits audit (ADMN-03/04/11, TDD, 5 tests) | `a450f65` | approveClip.ts/.test.ts, lib/logger.ts |
| 3 | AI co-pilot — schemas/prompts/streamCopilotObject helper, AION-10 grounding, stream route, accept/reject actions (ADMN-10/11, TDD, 5 tests) | `487c071` | copilot/*, grounding/*, stream/route.ts, copilot.ts/.test.ts |
| 4 | Three-pane editor surface (9 React components + page shell + 2 RTL test files, TDD, 8 tests) | `b6d20ad` | ThreePanePanels, TranscriptPane, PlayerPane, MetadataTab, CopilotTab, SuggestionCard, DiffView, AION10Badge, page.tsx, *.test.tsx |

## Verification

- `pnpm exec vitest run apps/web/app/actions/curate/ apps/web/lib/curate/ apps/web/app/(admin)/curate/` — 21/21 tests pass (hardBlock + approveClip + copilot + MetadataTab + TranscriptPane)
- `pnpm exec vitest run packages/core/src/llm/` — 7/7 tests pass (similarityCheck + llm)
- `pnpm exec vitest run` — 115/115 tests pass (all 23 files)
- `pnpm --filter @cited/web exec tsc --noEmit` — exits 0 (Turbo: 6 packages clean)
- Acceptance greps all pass: PanelGroup / useVirtualizer / YouTubeEmbed / length-hint / approveClip / diffWords / may be unsupported

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] react-resizable-panels v4.11 exports Group/Panel/Separator, not PanelGroup/PanelResizeHandle**
- **Found during:** Task 4
- **Issue:** Plan specified `import { PanelGroup, PanelResizeHandle }` from `react-resizable-panels`. The actual v4.11 API exports `Group`, `Panel`, and `Separator`. TS would reject the named imports.
- **Fix:** `import { Panel, Group as PanelGroup, Separator as PanelResizeHandle }` — aliased to match plan intent exactly; all instances use `PanelGroup` + `PanelResizeHandle` in the component body, preserving the grep check.
- **Files modified:** `ThreePanePanels.tsx`
- **Commit:** `b6d20ad`

**2. [Rule 1 — Bug] approveClipSchema._def.schema.omit() fails — ZodEffects has no .omit()**
- **Found during:** Task 4 (MetadataTab TypeScript check)
- **Issue:** MetadataTab originally called `approveClipSchema._def.schema.omit({clipId:true})` to get a form schema. Since the plan's schema uses `.refine()`, the schema is `ZodEffects`, not `ZodObject`. `_def.schema` does exist at runtime but `zodResolver` fails on `ZodEffects`.
- **Fix:** Split export into `approveClipBaseSchema` (pure `ZodObject`) and `approveClipSchema` (`ZodEffects` wrapping the base). MetadataTab uses `approveClipBaseSchema.omit({clipId:true})`; the server action uses the full `approveClipSchema`. No behavioral change — same validation runs at the server boundary.
- **Files modified:** `schemas.ts`, `MetadataTab.tsx`
- **Commit:** `b6d20ad`

**3. [Rule 3 — Blocking] ResizeObserver not defined in jsdom; Radix UI Select fails MetadataTab RTL tests**
- **Found during:** Task 4 (first test run)
- **Issue:** Radix UI's `Select` component calls `ResizeObserver` in `useEffect`. jsdom does not implement it. The first RTL render of `MetadataTab` threw `AggregateError: ResizeObserver is not defined`.
- **Fix:** Added `global.ResizeObserver` stub to `vitest.setup.ts`. Added `setupFiles: ['./vitest.setup.ts']` to `vitest.config.ts`. Also added `apps/web/vitest.d.ts` with `/// <reference types="@testing-library/jest-dom" />` to resolve `toBeInTheDocument` TS errors.
- **Files modified:** `vitest.setup.ts`, `vitest.config.ts`, `apps/web/vitest.d.ts`
- **Commit:** `b6d20ad`

**4. [Rule 3 — Blocking] @testing-library/user-event not installed**
- **Found during:** Task 4 (MetadataTab.test.tsx import)
- **Issue:** Plan called for RTL + userEvent tests but `@testing-library/user-event` was absent from all package.jsons.
- **Fix:** `pnpm add -Dw @testing-library/user-event` at workspace root.
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Commit:** `b6d20ad`

**5. [Rule 1 — Adaptation] Workspace naming: plan uses @hdiary/*; project is @cited/***
- **Found during:** All tasks (documented in earlier SUMMARYs)
- **Fix:** Used `@cited/core`, `@cited/db`, `@cited/web` everywhere.

### Test Behavior Adjustments

- **TranscriptPane shift-click test:** Component is fully controlled (selection state lives in parent). Test uses `rerender()` to simulate parent state update between click and shift-click. Behavior is identical; test is realistic for how the component will be used.
- **MetadataTab onSubmit assertion:** `react-hook-form` calls `handleSubmit(cb)` with `(values, event)` — two arguments. Changed to `mockOnSubmit.mock.calls[0]?.[0]` + `.toMatchObject()` rather than `toHaveBeenCalledWith(objectContaining(...))` to avoid second-argument mismatch.

## Auth Gates

None. All server actions mock `getSessionUser` in tests. The real route relies on Phase 1's Supabase Auth + RLS. `ANTHROPIC_API_KEY` is checked at `streamCopilotObject()` call time but the test seam bypasses the real provider — no live key required.

## Out-of-Scope Discoveries (Deferred)

- `Cited-design-reference/` directory and `compass_artifact_…markdown.md` remain untracked at repo root — pre-existing, untouched.
- `apps/web/package.json` shows as modified (pre-execution state, not from this plan's changes beyond the test-library install).

## Known Stubs

- `CopilotTab.tsx` manual streaming implementation uses native `fetch` + `ReadableStream` reader to parse the Vercel AI SDK text stream. Phase 3 may swap to the AI SDK's `useObject` hook once streaming state management is clearer. The current implementation is functional but reads the full stream before updating the suggestion card — partial-object streaming is deferred.
- `ThreePanePanels onSaveDraft` shows a toast "Persistence lands in 02-05" — draft persistence is intentionally deferred to Plan 05.

## Self-Check: PASSED

Verified files exist:
- `apps/web/lib/curate/hardBlockKeywords.ts` — FOUND
- `apps/web/app/actions/curate/approveClip.ts` — FOUND
- `apps/web/app/actions/curate/copilot.ts` — FOUND
- `packages/core/src/llm/copilot/schemas.ts` — FOUND
- `packages/core/src/llm/copilot/index.ts` — FOUND
- `packages/core/src/llm/grounding/similarityCheck.ts` — FOUND
- `apps/web/app/api/admin/copilot/stream/route.ts` — FOUND
- `apps/web/app/(admin)/curate/editor/[clipId]/page.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/editor/ThreePanePanels.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/editor/TranscriptPane.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/editor/PlayerPane.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/editor/MetadataTab.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/editor/CopilotTab.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/copilot/SuggestionCard.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/copilot/DiffView.tsx` — FOUND
- `apps/web/app/(admin)/curate/_components/copilot/AION10Badge.tsx` — FOUND

Verified commits exist:
- `64c2953` — FOUND (Task 1)
- `a450f65` — FOUND (Task 2)
- `487c071` — FOUND (Task 3)
- `b6d20ad` — FOUND (Task 4)
