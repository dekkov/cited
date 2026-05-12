---
phase: 02-curation-tooling-doac-corpus
plan: 06
subsystem: gating-and-legal
tags: [aion-10, lgl-01, lgl-02, lgl-08, admn-09, vitest, playwright, github-actions]
requires:
  - "@cited/core llm registry (Phase 1) — for live AION-10 judge via getLlm()"
  - "warm-paper-sage CSS tokens from globals.css (Phase 1) — HealthDisclaimer colors"
provides:
  - "tests/eval/aion-10/runner.ts — vitest gating runner with grounded≥90% / hallucinated==0% thresholds"
  - ".github/workflows/aion10-eval.yml — PR gate on llm/ or prompts/ changes"
  - "apps/web/components/disclaimer/HealthDisclaimer.tsx — variant=card|page|footer (LGL-01 scaffold)"
  - "apps/web/app/legal/dmca/page.tsx — DMCA contact + 48h SLA (LGL-02)"
  - "MEDICAL_REVIEW.md §Clip Length Editorial Guidance (LGL-08)"
  - ".planning/phases/02-curation-tooling-doac-corpus/CURATION_TRACKER.md (ADMN-09)"
affects:
  - "Phase 3 will wire <HealthDisclaimer variant='card' /> into habit cards"
  - "Phase 5 / AION-10 fixture promotion expands fixtures.jsonl from 5 → ≥20"
tech-stack:
  added:
    - "zod (root devDeps) + @cited/core (root workspace dep) — for tests/eval to resolve"
  patterns:
    - "Vitest describe.runIf(env flag) for CI-only live LLM gates; unit tests use mocked judge"
    - "esbuild jsx=automatic at vitest config root (no React import in .tsx tests)"
key-files:
  created:
    - "tests/eval/aion-10/fixtures.jsonl (5 seed rows)"
    - "tests/eval/aion-10/judge-prompt.md"
    - "tests/eval/aion-10/runner.ts (parseFixtures + runEval + assertThresholds + gated describe)"
    - "tests/eval/aion-10/runner.test.ts (6 unit tests, 1 live-only skipped)"
    - "tests/eval/aion-10/README.md"
    - ".github/workflows/aion10-eval.yml"
    - "apps/web/components/disclaimer/HealthDisclaimer.tsx"
    - "apps/web/components/disclaimer/HealthDisclaimer.test.tsx"
    - "apps/web/app/legal/dmca/page.tsx"
    - "apps/web/app/legal/dmca/page.test.tsx"
    - "apps/web/e2e/legal-dmca.spec.ts"
    - ".planning/phases/02-curation-tooling-doac-corpus/CURATION_TRACKER.md"
  modified:
    - "MEDICAL_REVIEW.md — appended §Clip Length Editorial Guidance (LGL-08)"
    - "vitest.config.ts — added tests/** include glob + esbuild jsx=automatic"
    - "package.json — added zod + @cited/core devDeps"
    - "pnpm-lock.yaml"
decisions:
  - "Gated live LLM eval with AION10_LIVE_EVAL=1 env var so unit-test runs stay offline-fast"
  - "Hallucinated tolerance checked before grounded threshold in assertThresholds — a single hallucination fails the gate regardless of grounded rate"
  - "Used relative import in app/legal/dmca/page.tsx (../../../components/...) so vitest resolves without configuring @/ alias"
  - "Dynamic import('@cited/core') inside runner default-judge keeps unit tests from triggering the workspace LLM dep graph"
metrics:
  duration_seconds: 232
  completed_at: "2026-05-12T00:43:34Z"
  tasks: 3
  files_created: 12
  files_modified: 4
  commits: 3
---

# Phase 02 Plan 06: AION-10 Gating + Legal Artifacts Summary

**One-liner:** Landed the AION-10 LLM-as-judge eval scaffold (5 fixtures + judge prompt + vitest runner + GitHub Actions PR gate), the `/legal/dmca` page with 48-hour SLA, the variant-aware `HealthDisclaimer` component scaffolded for Phase 3 habit cards, the LGL-08 Clip Length Editorial Guidance section in `MEDICAL_REVIEW.md`, and the maintainer-facing `CURATION_TRACKER.md` for the ≥30-clip × 4-domain Phase 2 corpus goal.

## What Shipped

### Task 1 — AION-10 hallucination eval scaffold (commit `82d7b82`)
- `tests/eval/aion-10/fixtures.jsonl` — 5 seed rows (3 grounded, 2 hallucinated), marked `reviewer: "seed-stub"` for replacement during curation.
- `tests/eval/aion-10/judge-prompt.md` — system prompt for the Claude Sonnet judge with grounded/hallucinated definitions.
- `tests/eval/aion-10/runner.ts` — exports `parseFixtures`, `runEval`, `assertThresholds`, `GROUNDED_THRESHOLD=0.9`, `HALLUCINATED_TOLERANCE=0.0`. Default judge dynamically imports `@cited/core` for the live LLM path. Live gating `describe` is wrapped in `describe.runIf(process.env['AION10_LIVE_EVAL'] === '1')` so the unit-test suite runs offline.
- `tests/eval/aion-10/runner.test.ts` — 6 mocked-judge unit tests cover: parse, all-grounded passes, hallucinated path throws, grounded-rate path throws, missing-file error, malformed-json error.
- `tests/eval/aion-10/README.md` — documents fixture-leakage discipline (Pitfall 9) and the thresholds.
- `.github/workflows/aion10-eval.yml` — triggers on `packages/core/{src/,}llm/**`, `**/prompts/**`, `tests/eval/aion-10/**`. Sets `AION10_LIVE_EVAL=1` plus secrets.

### Task 2 — HealthDisclaimer + /legal/dmca (commit `33c3c3f`)
- `apps/web/components/disclaimer/HealthDisclaimer.tsx` — `variant: 'card' | 'page' | 'footer'` prop adjusts size; `data-variant` attribute exposed for testing; uses `--color-ink-*` / `--color-rule` tokens from `globals.css`.
- `apps/web/app/legal/dmca/page.tsx` — H1 "DMCA Takedown Requests", 48-hour SLA copy, required-information list, 17 USC § 512(g) counter-notice reference, embedded `<HealthDisclaimer variant="page" />`.
- RTL unit tests for both surfaces (6 passing).
- `apps/web/e2e/legal-dmca.spec.ts` — Playwright spec asserts heading + SLA + email visibility.

### Task 3 — LGL-08 + ADMN-09 (commit `82b3e1e`)
- `MEDICAL_REVIEW.md` — appended verbatim 5-point Clip Length Editorial Guidance section (no hard cap; sponsor-read offset; qualifier-in-window; fair-use factors 1+4 lean; hard exclusions).
- `.planning/phases/02-curation-tooling-doac-corpus/CURATION_TRACKER.md` — per-domain progress table (sleep / nutrition_gut / exercise_longevity / mental_health × ≥7 = ≥30), SQL refresh query, AION-10 fixture promotion log, per-session hours table.

## Verification

```
pnpm vitest run tests/eval/aion-10/runner.test.ts \
  apps/web/components/disclaimer/ apps/web/app/legal/dmca/
→ 3 test files passed, 12 passed | 1 skipped
```

Acceptance grep checks (all OK):
- `Clip Length Editorial Guidance (LGL-08)` ✓
- `Sponsor-read offset rule` ✓
- `Qualifier-must-be-in-window` ✓
- `Hard exclusions` ✓
- `Phase 2 Curation Tracker` ✓
- `GROUNDED_THRESHOLD = 0.9` ✓
- `packages/core/src/llm/**` + `**/prompts/**` workflow path filters ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — blocking] Plan referenced `@hdiary/core` but the workspace package is `@cited/core`**
- Found during: Task 1 (writing runner.ts imports).
- Issue: Plan template assumed an older project name; the actual workspace is `@cited/core` (PROJECT.md lock: working name "Cited").
- Fix: All `getLlm` imports use `@cited/core`. Added `@cited/core: workspace:*` to root devDeps so vite/vitest can resolve the dynamic import.
- Commit: 82d7b82.

**2. [Rule 3 — blocking] vitest include glob did not cover `tests/**`**
- Found during: Task 1 first test run (`No test files found`).
- Issue: `vitest.config.ts` included only `{apps,packages}/**`, so the AION-10 unit tests under `tests/eval/aion-10/` couldn't run.
- Fix: Added `'tests/**/*.{test,spec}.{ts,tsx}'` to the include array.
- Commit: 82d7b82.

**3. [Rule 3 — blocking] zod was not a root dependency**
- Found during: Task 1 first test run.
- Issue: `tests/eval/aion-10/runner.ts` imports `zod`, but the root `package.json` did not list it (packages/core has it).
- Fix: Added `zod: ^3.23` to root devDependencies.
- Commit: 82d7b82.

**4. [Rule 1 — bug] Live LLM `describe` in runner.ts triggered an `ANTHROPIC_API_KEY` failure during unit-test runs**
- Found during: Task 1 first passing-tests run — 5/7 passed but the live-eval describe block fired without a key.
- Issue: `describe` calls run at module-load time; importing the runner from `runner.test.ts` caused the live eval to try to call Anthropic.
- Fix: Wrapped the live eval in `describe.runIf(process.env['AION10_LIVE_EVAL'] === '1')`. Workflow sets `AION10_LIVE_EVAL=1`; local unit-test runs leave it unset.
- Commit: 82d7b82.

**5. [Rule 1 — bug] `assertThresholds` ordered the grounded check before the hallucinated check, causing the hallucinated unit test to assert on the wrong error message**
- Found during: Task 1 unit-test fix-up.
- Issue: With 1 hallucinated + 4 grounded the grounded rate is 80%, so the grounded threshold fired first and the test's `/hallucinated/` regex never matched.
- Fix: Flipped the order — hallucinated tolerance is the harder line and is checked first. Updated inline comment.
- Commit: 82d7b82.

**6. [Rule 1 — bug] `apps/web/app/legal/dmca/page.tsx` import via `@/` alias broke vitest resolution**
- Found during: Task 2 test run.
- Issue: vitest doesn't read Next's tsconfig `paths` mapping by default; the `@/components/...` import failed.
- Fix: Switched to a relative import (`../../../components/disclaimer/HealthDisclaimer`). Next.js still resolves it at build time.
- Commit: 33c3c3f.

**7. [Rule 1 — bug] JSX tests required an explicit `React` import**
- Found during: Task 2 test run.
- Issue: Root tsconfig has `jsx: 'preserve'`; vitest's default esbuild settings didn't pick up automatic runtime, so `.tsx` tests threw `React is not defined`.
- Fix: Added `esbuild: { jsx: 'automatic' }` to vitest.config.ts. Aligns with React 19 + Next 16 conventions.
- Commit: 33c3c3f.

### Auth gates / Architectural changes
None.

## Known Stubs

- `tests/eval/aion-10/fixtures.jsonl` rows are marked `"reviewer": "seed-stub"` — synthetic placeholders to unblock the gate. Real DOAC-derived fixtures will be promoted from `aion10_fixture_candidates` (Plan 01 schema) during curation; target ≥20 by end of Phase 2. CURATION_TRACKER.md tracks this promotion.
- `apps/web/app/legal/dmca/page.tsx` email reads `dmca@<chosen-domain>` because the project name is still under trademark/domain check (Decision: NAME-02/03 in Phase 4). The 48h SLA and counter-notice content is locked; only the domain placeholder will change pre-launch.
- `HealthDisclaimer` is created but not yet wired into habit cards — that's Phase 3 per the plan's stated scope ("Phase 3 will wire it in").

## Self-Check: PASSED

Files (all FOUND):
- `tests/eval/aion-10/fixtures.jsonl` ✓
- `tests/eval/aion-10/judge-prompt.md` ✓
- `tests/eval/aion-10/runner.ts` ✓
- `tests/eval/aion-10/runner.test.ts` ✓
- `tests/eval/aion-10/README.md` ✓
- `.github/workflows/aion10-eval.yml` ✓
- `apps/web/components/disclaimer/HealthDisclaimer.tsx` ✓
- `apps/web/components/disclaimer/HealthDisclaimer.test.tsx` ✓
- `apps/web/app/legal/dmca/page.tsx` ✓
- `apps/web/app/legal/dmca/page.test.tsx` ✓
- `apps/web/e2e/legal-dmca.spec.ts` ✓
- `MEDICAL_REVIEW.md` (with LGL-08 section) ✓
- `.planning/phases/02-curation-tooling-doac-corpus/CURATION_TRACKER.md` ✓

Commits (all FOUND):
- `82d7b82` feat(02-06): AION-10 eval scaffold ✓
- `33c3c3f` feat(02-06): HealthDisclaimer + /legal/dmca ✓
- `82b3e1e` docs(02-06): LGL-08 + CURATION_TRACKER ✓
