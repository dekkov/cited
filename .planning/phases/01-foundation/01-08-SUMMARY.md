---
phase: 01-foundation
plan: 08
subsystem: web-auth
tags: [consent, gdpr, article-9, dob-gate, coppa, legal, onboarding, supabase-auth, drizzle, nextjs]

# Dependency graph
requires:
  - phase: 01-foundation
    plan: 04
    provides: "consent_records table, profiles table with disclaimerAcceptedAt/dob/dobJurisdiction"
  - phase: 01-foundation
    plan: 05
    provides: "Next.js route groups, (app)/layout.tsx + (admin)/layout.tsx, disclaimer-banner"
  - phase: 01-foundation
    plan: 07
    provides: "requireUser() guard with real Supabase session (parallel wave 3)"

provides:
  - Pure age-gate function: isAgeAllowed(dob, jurisdiction, now) with US/EU/other thresholds
  - /onboarding/legal-gate page with 3 independently togglable consent switches + DOB + disclaimer ack
  - Server action: validates age, writes consent_records x3, sets profile fields (transaction)
  - requireLegalGatePassed() guard in lib/auth/legal-gate.ts
  - (app) and (admin) layouts now enforce legal gate after requireUser
  - /api/account/export PROF-03 stub: JSON export of profile + consent_records
  - Playwright E2E spec: 4 tests covering redirect, under-13 error, valid x3 separability, no-loop

affects: [02-admn, 03-hab-rec-aion, 04-launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Import eq from @cited/db not drizzle-orm directly — avoids dual-instance TypeScript error from @opentelemetry/api peer peer resolution"
    - "(onboarding) route group does NOT contribute to URL — files must be at (onboarding)/onboarding/legal-gate/ for /onboarding/legal-gate URL"
    - "useActionState<FormState, FormData> with explicit type params for react 19 server actions"
    - "Leap-year Feb 29 birthday → Mar 1 anniversary in non-leap years in isAgeAllowed"

key-files:
  created:
    - apps/web/lib/auth/age.ts (isAgeAllowed + AgeGateError + Jurisdiction type)
    - apps/web/lib/auth/age.test.ts (8 vitest tests)
    - apps/web/lib/auth/legal-gate.ts (isLegalGatePassed + requireLegalGatePassed)
    - apps/web/app/(onboarding)/layout.tsx (bare layout, requireUser only)
    - apps/web/app/(onboarding)/onboarding/legal-gate/page.tsx
    - apps/web/app/(onboarding)/onboarding/legal-gate/legal-gate-form.tsx
    - apps/web/app/(onboarding)/onboarding/legal-gate/actions.ts
    - apps/web/app/api/account/export/route.ts (PROF-03 stub)
    - apps/web/e2e/legal-gate.spec.ts (4 E2E tests)
  modified:
    - apps/web/app/(app)/layout.tsx (+ requireLegalGatePassed call)
    - apps/web/app/(admin)/layout.tsx (+ requireLegalGatePassed call)
    - apps/web/lib/auth/guards.ts (import eq from @cited/db — fixes dual drizzle-orm type issue)

decisions:
  - "Import eq from @cited/db not drizzle-orm — fixes TS2345/TS2769 dual-instance error caused by @opentelemetry/api peer resolution creating two drizzle-orm type declarations with separate private shouldInlineParams"
  - "Route group (onboarding) requires an extra onboarding/ directory to produce /onboarding/legal-gate URL — route groups are organizational only, not URL contributors"
  - "consent_health_adjacent and consent_ai_free_text are optional in Zod schema (z.string().optional()) since unchecked checkboxes are absent from FormData — granted=false is computed by checking !== 'on'"

# Metrics
duration: ~6min
completed: 2026-05-09
---

# Phase 01 Plan 08: Consent / DOB / Disclaimer Summary

**Article 9 GDPR-compliant legal gate with DOB/jurisdiction age check, 3 granular consent toggles, disclaimer acknowledgment, and PROF-03 JSON export stub — closing AUTH-04, AUTH-05, AUTH-06, and PROF-03 schema plumbing**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-09T01:45:09Z
- **Completed:** 2026-05-09T01:51:35Z
- **Tasks:** 3 / 3
- **Files created:** 9 | **Files modified:** 3

## Legal Gate Flow Path

```
Sign-in (01-07)
  → /auth/callback → redirected to /dashboard
  → (app)/layout.tsx: requireUser() then requireLegalGatePassed()
  → profiles.disclaimerAcceptedAt IS NULL → redirect('/onboarding/legal-gate')
  → /onboarding/legal-gate: DOB + jurisdiction + 3 consent toggles + disclaimer_ack
  → submitLegalGate action:
      1. requireUser() — verify still signed in
      2. Zod parse formData
      3. isAgeAllowed(dob, jurisdiction) — returns false → error message
      4. Transaction:
         a. UPDATE profiles SET disclaimerAcceptedAt, dob, dobJurisdiction, updatedAt
         b. INSERT consent_records x3 (account/health_adjacent/ai_free_text with granted flag)
      5. redirect('/dashboard')
  → /dashboard loads normally
```

## Three consent_records Rows

| scope | required | default granted |
|-------|----------|-----------------|
| account | Yes (checkbox required) | true |
| health_adjacent | Optional | user's choice |
| ai_free_text | Optional | user's choice |

Each row includes: userId, scope, granted (bool), grantedAt, userAgent, ipHash (sha256 of x-forwarded-for, nullable).

## Age Thresholds

| Jurisdiction | Minimum age |
|--------------|-------------|
| us | 13 (COPPA) |
| eu | 16 (GDPR Art. 8) |
| other | 13 (COPPA floor) |

Leap-year DOBs (Feb 29) use Mar 1 as anniversary in non-leap years.

## Task Commits

1. **Task 1 (TDD): Pure age-gate function** — `d1265e5`
2. **Task 2: Legal-gate route group + form + action + guard** — `c382965`
3. **Task 3: PROF-03 export route + E2E spec** — `f04ee84`
4. **Fix: URL correction (route group structure)** — `11e3772`

## Files Created/Modified

- `/home/king/Hdiary/apps/web/lib/auth/age.ts` — pure age gate (6 exports)
- `/home/king/Hdiary/apps/web/lib/auth/age.test.ts` — 8 tests
- `/home/king/Hdiary/apps/web/lib/auth/legal-gate.ts` — requireLegalGatePassed guard
- `/home/king/Hdiary/apps/web/app/(onboarding)/layout.tsx` — bare onboarding layout
- `/home/king/Hdiary/apps/web/app/(onboarding)/onboarding/legal-gate/` — 3 files (page, form, actions)
- `/home/king/Hdiary/apps/web/app/api/account/export/route.ts` — PROF-03 stub
- `/home/king/Hdiary/apps/web/e2e/legal-gate.spec.ts` — 4 E2E tests

## Decisions Made

- **Import eq from @cited/db**: drizzle-orm has two instances in pnpm due to @opentelemetry/api peer resolution variant (`@opentelemetry+api@1.9.0` vs without). Importing `eq` directly from `drizzle-orm` in apps/web causes TS2345 "separate declarations of private property shouldInlineParams". Fix: import from `@cited/db` which re-exports from one concrete drizzle-orm installation.
- **Route group URL structure**: Next.js route groups `(name)` are organizational only — they do not contribute to URL. The plan URL `/onboarding/legal-gate` requires the file at `app/(onboarding)/onboarding/legal-gate/page.tsx`, not `app/(onboarding)/legal-gate/page.tsx` (which maps to `/legal-gate`).
- **Optional consent fields**: Unchecked checkboxes are absent from FormData. Using `z.string().optional()` instead of `z.union([z.literal('on'), z.undefined()])` is equivalent and cleaner. `granted = value === 'on'` correctly computes false for absent fields.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong URL /legal-gate instead of /onboarding/legal-gate**
- **Found during:** Task 2 build verification
- **Issue:** Files at `app/(onboarding)/legal-gate/` produce URL `/legal-gate` because route groups don't add to URL
- **Fix:** Moved files to `app/(onboarding)/onboarding/legal-gate/` to produce `/onboarding/legal-gate`
- **Files modified:** page.tsx, legal-gate-form.tsx, actions.ts (renamed/moved)
- **Commit:** `11e3772`

**2. [Rule 1 - Bug] Pre-existing dual drizzle-orm TS type conflict in guards.ts (from 01-07)**
- **Found during:** Task 2 typecheck
- **Issue:** `import { eq } from 'drizzle-orm'` in guards.ts caused TS2769 due to two drizzle-orm instances with different @opentelemetry/api peers
- **Fix:** Changed to `import { eq } from '@cited/db'` in guards.ts and in all new files
- **Files modified:** guards.ts, legal-gate.ts, actions.ts
- **Commit:** `c382965`

## Phase 4 Remaining Work (PROF-03)

- Expand `/api/account/export` to include: habits, check-ins, streaks
- Add re-consent / revoke-consent UI in Settings
- Cascade-delete integration test (PROF-04) running against live DB with pgvector embeddings
- Download button in the UI (Phase 4 account settings page)

## Phase 4 Remaining Work (UX Polish)

- Sign-out flow when under-minimum-age: currently returns error message only. Phase 4 can add a "sign out" button on the under-age error state.

## Hand-off to Phase 2 / 3

**AUTH-05(c) `ai_free_text` consent must be checked before any LLM call passes free-text user input.** When the Phase 2/3 onboarding interview uses Claude Haiku for free-text turns, `packages/core/llm` should add a `consent_check(userId, 'ai_free_text')` helper that queries `consent_records`. The schema plumbing is live from this plan.

---
*Phase: 01-foundation*
*Completed: 2026-05-09*

## Self-Check: PASSED

| Item | Status |
|------|--------|
| apps/web/lib/auth/age.ts | FOUND |
| apps/web/lib/auth/age.test.ts | FOUND |
| apps/web/lib/auth/legal-gate.ts | FOUND |
| apps/web/app/(onboarding)/layout.tsx | FOUND |
| apps/web/app/(onboarding)/onboarding/legal-gate/page.tsx | FOUND |
| apps/web/app/(onboarding)/onboarding/legal-gate/legal-gate-form.tsx | FOUND |
| apps/web/app/(onboarding)/onboarding/legal-gate/actions.ts | FOUND |
| apps/web/app/api/account/export/route.ts | FOUND |
| apps/web/e2e/legal-gate.spec.ts | FOUND |
| Commit d1265e5 (Task 1 — age gate TDD) | VERIFIED |
| Commit c382965 (Task 2 — legal gate route) | VERIFIED |
| Commit f04ee84 (Task 3 — export stub + E2E) | VERIFIED |
| Commit 11e3772 (fix — URL correction) | VERIFIED |
| pnpm --filter @cited/web typecheck → 0 | PASSED |
| pnpm --filter @cited/web build → /onboarding/legal-gate | PASSED |
| age.test.ts 8 tests | PASSED |
