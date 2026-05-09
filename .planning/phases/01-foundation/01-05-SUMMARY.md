---
phase: 01-foundation
plan: 05
subsystem: web
tags: [nextjs, react, tailwind, shadcn-ui, typescript, playwright, auth-guards, route-groups]

# Dependency graph
requires: [01-01-monorepo-bootstrap]
provides:
  - Next.js 16.2.6 + React 19 app skeleton (apps/web @cited/web)
  - Tailwind v4 CSS-first config with warm paper/sage design tokens from UI-DESIGN.md
  - shadcn/ui primitives: button, input, label, card (hand-written, UI token-aligned)
  - Four route groups: (marketing) / (auth) / (app) / (admin)
  - lib/auth/guards.ts: requireUser() + requireCurator() server-only stubs (01-07 fills body)
  - Disclaimer banner component (LGL-01 Phase 1 plumbing)
  - PROF-02 settings stub: display_name, timezone, privacy_mode fields
  - ADMN-01/02: (admin) route group with curator/admin role gate
  - AION-09 enforcement: noRestrictedImports Biome rule blocks direct @ai-sdk/* imports outside packages/core/llm
  - Security headers: Referrer-Policy, X-Content-Type-Options, X-Frame-Options on all routes
  - Playwright smoke spec: 4 tests (landing, login, dashboard redirect, admin redirect)
affects: [01-07, 01-08, 02-xx]

# Tech tracking
tech-stack:
  added:
    - next@16.2.6 (App Router, Turbopack dev)
    - react@19 + react-dom@19
    - tailwindcss@4.x (CSS-first, Oxide engine)
    - "@tailwindcss/postcss@4.x"
    - "@radix-ui/react-slot@1.2.4 (Button asChild)"
    - "@radix-ui/react-label@2.1.8"
    - class-variance-authority@0.7 (buttonVariants)
    - clsx@2 + tailwind-merge@2 (cn() helper)
    - lucide-react (icon library for shadcn)
    - server-only (guards.ts import discipline)
    - zod@3.23 (env validation)
  patterns:
    - Tailwind v4 CSS-first @import + @theme tokens (no tailwind.config.ts needed)
    - shadcn/ui copy-paste model — components owned by the repo, not a runtime dep
    - Server-only auth guards pattern — import 'server-only' enforced at file level
    - noRestrictedImports Biome nursery rule for AION-09 LLM SDK import discipline
    - playwright test --config ../../playwright.config.ts for per-package E2E invocation

key-files:
  created:
    - apps/web/next.config.ts (typedRoutes, transpilePackages, security headers)
    - apps/web/postcss.config.mjs (Tailwind v4 PostCSS plugin)
    - apps/web/components.json (shadcn/ui CLI config)
    - apps/web/app/globals.css (Tailwind v4 @import + warm paper/sage @theme tokens)
    - apps/web/app/layout.tsx (root layout, Newsreader + Geist Sans + Geist Mono fonts)
    - apps/web/app/page.tsx (marketing landing — Cited heading + Sign in CTA)
    - apps/web/lib/utils.ts (cn() helper)
    - apps/web/lib/env.ts (Zod env validation, fail-fast at startup)
    - apps/web/.env.example (6 env keys documented)
    - apps/web/biome.json (extends root + AION-09 noRestrictedImports)
    - apps/web/components/ui/button.tsx (shadcn Button, UI tokens, rounded-full pills)
    - apps/web/components/ui/input.tsx (shadcn Input, UI tokens)
    - apps/web/components/ui/label.tsx (shadcn Label, Radix primitive)
    - apps/web/components/ui/card.tsx (shadcn Card family, radius-xl, shadow-card)
    - apps/web/lib/auth/guards.ts (server-only, getSessionUser/requireUser/requireCurator stubs)
    - apps/web/app/(marketing)/layout.tsx (max-w-4xl wrapper)
    - apps/web/app/(auth)/layout.tsx (centered auth surface)
    - apps/web/app/(auth)/login/page.tsx (login card, disabled CTAs pending 01-07)
    - apps/web/app/(app)/layout.tsx (requireUser gate + DisclaimerBanner)
    - apps/web/app/(app)/dashboard/page.tsx (stub, Phase 3)
    - apps/web/app/(app)/settings/page.tsx (PROF-02 stub: display_name, timezone, privacy_mode)
    - apps/web/app/(admin)/layout.tsx (requireCurator gate + admin nav)
    - apps/web/app/(admin)/admin/page.tsx (stub, Phase 2)
    - apps/web/app/(admin)/admin/clips/page.tsx (stub, Phase 2)
    - apps/web/components/disclaimer-banner.tsx (LGL-01 Phase 1 plumbing, section element)
    - apps/web/e2e/smoke.spec.ts (4 Playwright smoke tests)
  modified:
    - apps/web/package.json (Next.js 16 deps, test:e2e script with --config flag)
    - apps/web/tsconfig.json (added paths @/* alias, incremental, noEmit)
    - .gitignore (added next-env.d.ts + *.tsbuildinfo)
  deleted:
    - apps/web/src/placeholder.ts (served its purpose from 01-01)

decisions:
  - "shadcn/ui components written manually (copy-paste model) using UI-DESIGN.md tokens instead of CLI init to ensure warm paper/sage palette from day 1"
  - "test:e2e script uses --config ../../playwright.config.ts so pnpm --filter @cited/web test:e2e works correctly from the apps/web directory"
  - "Route group URL structure: (admin) group uses app/(admin)/admin/page.tsx for /admin URL (not page.tsx at group root, which would conflict with app-level routing)"
  - "disclaimer-banner uses <section> not <div role=region> to satisfy Biome a11y/useSemanticElements"

# Metrics
duration: 7min
completed: 2026-05-09
---

# Phase 01 Plan 05: Next.js App Skeleton Summary

**Next.js 16 + React 19 + Tailwind v4 app skeleton with four route groups, shadcn/ui primitives aligned to the warm paper/sage design system, stub auth guards, PROF-02 settings, LGL-01 disclaimer banner, AION-09 import enforcement, and 4 passing Playwright smoke tests**

## Performance

- **Duration:** ~7 min (parallel execution — Task 1 files committed in add9310 by parallel 01-04 agent)
- **Started:** 2026-05-09T01:27:34Z
- **Completed:** 2026-05-09T01:34:00Z
- **Tasks:** 3 / 3
- **Files created:** 27 (plus 3 modified, 1 deleted)

## Route Group Architecture

| Route Group | URL Pattern | Guard | Layout Features |
|-------------|-------------|-------|-----------------|
| `(marketing)` | `/` | None | max-w-4xl wrapper |
| `(auth)` | `/login` | None | Centered paper-2 bg |
| `(app)` | `/dashboard`, `/settings` | `requireUser()` → `/login` | DisclaimerBanner + max-w-5xl |
| `(admin)` | `/admin`, `/admin/clips` | `requireCurator()` → `/login` or `/dashboard` | Admin nav with email/role display |

## Auth Guard Stub Design

`apps/web/lib/auth/guards.ts` is the integration point for plan 01-07:

```
lib/auth/guards.ts
  getSessionUser() → returns null (STUB — 01-07 replaces with @supabase/ssr)
  requireUser()    → calls getSessionUser(); redirect('/login') if null
  requireCurator() → calls getSessionUser(); redirect('/login') if null; redirect('/dashboard') if not curator/admin
```

**01-07 must:** Replace `getSessionUser()` body with `@supabase/ssr` `createServerClient` call + `profiles` table role lookup.

## shadcn/ui Status

Initialized with `components.json` (Tailwind v4, RSC, CSS vars, neutral base color). Components added in this plan:
- `button` — rounded-full pill shape per UI-DESIGN.md
- `input` — radius-md, color-rule border
- `label` — Radix @radix-ui/react-label
- `card` — radius-xl (24px), shadow-card, color-rule border

Future plans can add more components: `npx shadcn@latest add [component]` — the CLI config is in place.

## Outstanding Stubs (to be wired in later plans)

| Stub | Location | Wired in plan |
|------|----------|---------------|
| `getSessionUser()` returns null | `lib/auth/guards.ts:14` | 01-07 |
| Settings form — no server action | `app/(app)/settings/page.tsx` | 01-07 |
| Login form — disabled buttons | `app/(auth)/login/page.tsx` | 01-07 |
| Dashboard content | `app/(app)/dashboard/page.tsx` | Phase 3 |
| Admin/clips curation UI | `app/(admin)/admin/clips/page.tsx` | Phase 2 |

## Task Commits

1. **Task 1: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui init** — committed in `add9310` (by parallel 01-04 agent — files staged together)
2. **Task 2: Route groups + auth guards + settings + disclaimer** — `5bf8cd4`
3. **Task 3: Playwright smoke spec** — `43e2408`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `typedRoutes` moved from `experimental` to top-level in Next.js 16**
- **Found during:** Task 1 (build warning)
- **Issue:** `experimental.typedRoutes` is deprecated in Next.js 16; config should use top-level `typedRoutes`
- **Fix:** Moved `typedRoutes: true` to top-level in `next.config.ts`
- **Files modified:** `apps/web/next.config.ts`
- **Commit:** `add9310` (same batch)

**2. [Rule 1 - Bug] Biome a11y/useSemanticElements — `<div role="region">` should be `<section>`**
- **Found during:** Task 2 (biome check)
- **Issue:** `disclaimer-banner.tsx` used `<div role="region">` which triggers Biome's `useSemanticElements` rule
- **Fix:** Changed to `<section>` element with `aria-label` (equivalent semantics, Biome-compliant)
- **Files modified:** `apps/web/components/disclaimer-banner.tsx`
- **Commit:** `5bf8cd4`

**3. [Rule 3 - Blocking] `test:e2e` script failing with "Cannot navigate to invalid URL"**
- **Found during:** Task 3 (E2E test run from apps/web directory)
- **Issue:** Running `playwright test` from `apps/web/` directory couldn't find the root-level `playwright.config.ts`, so `baseURL` was unset — relative paths like `/` were treated as invalid URLs
- **Fix:** Updated `test:e2e` script to `playwright test --config ../../playwright.config.ts`
- **Files modified:** `apps/web/package.json`
- **Commit:** `43e2408`

**4. [Rule 2 - Missing] Design tokens from UI-DESIGN.md applied to globals.css and shadcn components**
- **Found during:** Task 1 (reading UI-DESIGN.md as required by CLAUDE.md)
- **Issue:** Plan specified generic shadcn color tokens; UI-DESIGN.md specifies exact warm paper/sage palette that must be used from day 1
- **Fix:** globals.css uses full warm paper/sage @theme tokens; shadcn components use CSS var references (--color-ink, --color-paper, --color-rule, etc.) throughout
- **Files modified:** `apps/web/app/globals.css`, all `components/ui/*.tsx`
- **Commit:** `add9310`

**5. [Rule 2 - Missing] Parallel agent committed Task 1 files in 01-04 commit**
- **Found during:** Task 1 commit attempt
- **Issue:** In parallel execution, the 01-04 agent staged and committed the apps/web Task 1 files (which were in the working tree) as part of its own batch commit `add9310`
- **Impact:** Task 1 files are correctly committed; the commit message credit goes to 01-04 but the code is correct
- **Action:** Proceeded directly to Task 2; no work was lost or duplicated

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `getSessionUser()` returns null | `apps/web/lib/auth/guards.ts` | 14 | Supabase Auth wiring deferred to 01-07; stubs make all guarded routes redirect to /login |
| Settings form non-interactive | `apps/web/app/(app)/settings/page.tsx` | 18 | Server action + profiles table update deferred to 01-07 |
| Login buttons disabled | `apps/web/app/(auth)/login/page.tsx` | 12-18 | Magic link + Google OAuth deferred to 01-07 |

These stubs DO NOT prevent the plan's goal (route group structure, guard shape, component plumbing) from being achieved. The redirect behavior is functional and verified by Playwright. The stubs are intentional and expected — 01-07 will fill them in.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| apps/web/next.config.ts (transpilePackages + Referrer-Policy) | FOUND |
| apps/web/app/globals.css (@import tailwindcss + @theme) | FOUND |
| apps/web/components.json (baseColor neutral) | FOUND |
| apps/web/components/ui/button.tsx | FOUND |
| apps/web/components/ui/input.tsx | FOUND |
| apps/web/components/ui/label.tsx | FOUND |
| apps/web/components/ui/card.tsx | FOUND |
| apps/web/lib/env.ts (NEXT_PUBLIC_SUPABASE_URL) | FOUND |
| apps/web/.env.example (NEXT_PUBLIC_SUPABASE_URL + OPENAI_API_KEY) | FOUND |
| apps/web/biome.json (noRestrictedImports) | FOUND |
| apps/web/lib/auth/guards.ts (requireUser + requireCurator + server-only) | FOUND |
| apps/web/app/(admin)/layout.tsx (requireCurator) | FOUND |
| apps/web/app/(app)/layout.tsx (requireUser) | FOUND |
| apps/web/app/(auth)/login/page.tsx (Sign in) | FOUND |
| apps/web/app/(app)/settings/page.tsx (display_name, timezone, privacy_mode) | FOUND |
| apps/web/components/disclaimer-banner.tsx (not medical advice) | FOUND |
| apps/web/e2e/smoke.spec.ts (4 tests) | FOUND |
| Commit 5bf8cd4 (Task 2) | VERIFIED |
| Commit 43e2408 (Task 3) | VERIFIED |
| pnpm --filter @cited/web typecheck → 0 | PASSED |
| pnpm --filter @cited/web build → 0 | PASSED |
| pnpm --filter @cited/web test:e2e → 4 passed | PASSED |
