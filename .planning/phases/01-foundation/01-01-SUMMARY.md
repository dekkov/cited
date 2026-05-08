---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [pnpm, turborepo, typescript, biome, husky, vitest, playwright, github-actions, gitleaks, monorepo]

# Dependency graph
requires: []
provides:
  - pnpm@9.15.0 workspace with apps/* and packages/* glob configuration
  - Turborepo pipeline (dev/build/lint/typecheck/test/test:e2e tasks)
  - Strict TypeScript base config (strict, noUncheckedIndexedAccess, verbatimModuleSyntax)
  - Package stubs @cited/db, @cited/core, @cited/ui, @cited/config, @cited/api-contracts
  - apps/web stub (Next.js install in 01-05); apps/worker doc-only README
  - Biome 1.9.4 lint+format config
  - Husky pre-commit (lint-staged + typecheck) and commit-msg (conventional commits) hooks
  - Vitest 2.1.9 + jsdom environment, v8 coverage, monorepo include pattern
  - Playwright 1.59.1 config wired to apps/web/e2e
  - GitHub Actions CI: verify (turbo lint+typecheck+test) + gitleaks jobs
  - Smoke test in packages/core confirming Vitest pipeline works
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08]

# Tech tracking
tech-stack:
  added:
    - pnpm@9.15.9 (workspace package manager)
    - turbo@2.9.10 (monorepo task runner with caching)
    - typescript@5.6.3 (strict mode, verbatimModuleSyntax)
    - "@biomejs/biome@1.9.4 (lint + format, replaces ESLint+Prettier)"
    - husky@9.1.7 (git hooks)
    - lint-staged@15.5.2 (staged-file runner for pre-commit)
    - vitest@2.1.9 (unit/integration test runner)
    - "@testing-library/react@16.3.2"
    - "@testing-library/jest-dom@6.9.1"
    - jsdom@25.0.1 (DOM environment for vitest)
    - "@playwright/test@1.59.1 (E2E testing)"
    - gitleaks-action@v2 (secrets scanning in CI)
  patterns:
    - Per-package tsconfig.json extending tsconfig.base.json
    - Per-package vitest.config.ts for local test runs (packages with tests)
    - Root-level vitest.config.ts with {apps,packages}/**/*.{test,spec}.{ts,tsx} include for workspace-wide runs
    - Turborepo task caching — typecheck uses FULL TURBO cache on unchanged packages
    - Conventional Commits enforced at commit-msg hook level (no extra dependency)
    - Biome replace-all: single-space, single-quote, 100-char, LF, trailing commas

key-files:
  created:
    - package.json (monorepo root, scripts delegate to turbo)
    - pnpm-workspace.yaml (workspace globs)
    - turbo.json (pipeline definitions)
    - tsconfig.base.json (strict TS base extended by all packages)
    - biome.json (lint+format config)
    - .husky/pre-commit (lint-staged + typecheck)
    - .husky/commit-msg (conventional commits check)
    - vitest.config.ts (root Vitest config)
    - playwright.config.ts (Playwright config → apps/web/e2e)
    - .github/workflows/ci.yml (verify + gitleaks jobs)
    - .gitleaks.toml (allowlist .env.example)
    - packages/core/src/index.test.ts (smoke test)
    - packages/core/vitest.config.ts (local package test config)
    - apps/worker/README.md (doc-only stub for Phase 5)
  modified: []

key-decisions:
  - "Biome 1.9.4 chosen over ESLint+Prettier per CLAUDE.md locked decision — single binary, no config sprawl"
  - "Per-package vitest.config.ts added to @cited/core (and pattern for future packages) because root vitest.config include pattern resolves relative to CWD and fails when invoked from within a package directory"
  - "apps/web placeholder src/placeholder.ts added to satisfy tsc --noEmit (needs at least one input file) — removed when Next.js is installed in 01-05"
  - "Biome ignore list extended to cover .planning/ and Cited-design-reference/ (pre-existing dirs not part of the monorepo source)"

patterns-established:
  - "Turbo caching: typecheck/build tasks cache aggressively; dev is cache:false persistent:true"
  - "Package naming: @cited/{package} for all internal packages"
  - "Package exports: main/types/exports all point to ./src/index.ts (no build step for internal packages)"
  - "Commit format: <type>(<phase>-<plan>): description — enforced by commit-msg hook"

requirements-completed: [FND-01, FND-02, FND-03, FND-05, FND-09]

# Metrics
duration: 56min
completed: 2026-05-08
---

# Phase 01 Plan 01: Monorepo Bootstrap Summary

**pnpm + Turborepo monorepo with 6 workspace packages, strict TypeScript, Biome lint/format, Husky git hooks, Vitest + Playwright test pipeline, and GitHub Actions CI with gitleaks secrets scanning**

## Performance

- **Duration:** 56 min
- **Started:** 2026-05-08T20:56:21Z
- **Completed:** 2026-05-08T21:52:48Z
- **Tasks:** 3 / 3
- **Files modified:** 34 (including pnpm-lock.yaml)

## Accomplishments

- Full monorepo workspace wired: apps/web (stub), apps/worker (doc-only), packages/db, packages/core, packages/ui, packages/config, packages/api-contracts — all recognized by pnpm workspaces
- Strict TypeScript base (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax) extended by every package; `pnpm typecheck` passes in all 6 packages via Turborepo
- Biome 1.9.4 lints + formats all source files; Husky pre-commit auto-formats staged files and runs typecheck; commit-msg hook enforces Conventional Commits with no extra dependency
- Vitest smoke test running in packages/core; `pnpm test` reports 1 pass, 5 passWithNoTests; Playwright config wired to apps/web/e2e
- GitHub Actions CI: `verify` job (pnpm install --frozen-lockfile + turbo lint/typecheck/test) and `gitleaks` job run on every PR and push to main

## Installed Versions

| Tool | Version |
|------|---------|
| pnpm | 9.15.9 (agent) / 9.15.0 (pinned in packageManager field) |
| Node.js | v24.13.1 (host) / 20.11.1 (pinned in .nvmrc) |
| turbo | 2.9.10 |
| TypeScript | 5.6.3 |
| @biomejs/biome | 1.9.4 |
| husky | 9.1.7 |
| vitest | 2.1.9 |
| @playwright/test | 1.59.1 |

## Workspace Shape

```
cited-monorepo/
  apps/
    web/          @cited/web     — Next.js app (wired in 01-05)
    worker/       (doc-only)     — Phase 5 Python worker stub
  packages/
    db/           @cited/db      — Drizzle schemas + DB client (wired in 01-04)
    core/         @cited/core    — Business logic + domain types
    ui/           @cited/ui      — shadcn/ui components (wired in 01-05)
    config/       @cited/config  — Env validation + shared config
    api-contracts/ @cited/api-contracts — Zod schemas for API + job-table contract
```

## What Wave-2+ Plans Need to Know

- **@cited/db**: Drizzle ORM + postgres driver + pgvector go here. Install in plan 01-04. The tsconfig extends the base; the exports field points to `./src/index.ts` — no build step needed for workspace consumers.
- **@cited/api-contracts**: Zod schemas for extraction_jobs + clips_pending job tables. Referenced by apps/worker/README.md; populated in plan 01-04.
- **apps/web/src/placeholder.ts**: Remove this file when Next.js is installed in plan 01-05 (it exists only to give tsc at least one input file).
- **biome.json ignore**: Any new top-level directories that aren't monorepo source (docs site, etc.) should be added to the `files.ignore` list.
- **Per-package vitest.config.ts**: packages/core demonstrates the pattern. Any package that adds real tests should add its own `vitest.config.ts` with `include: ['src/**/*.{test,spec}.{ts,tsx}']`.
- **CI gitleaks**: `.gitleaks.toml` allowlists `*.env.example` files. Add other safe patterns as needed (e.g., test fixtures).
- **Turborepo caching**: `typecheck` and `test` depend on `^build`, which means packages need a `build` output to chain correctly. At MVP all packages use `main: "./src/index.ts"` (no build step), which is fine. When packages add a real build output in later plans, update turbo.json if needed.

## Task Commits

1. **Task 1: Workspace skeleton + pnpm + Turborepo + strict TS base** — `8642432` (chore)
2. **Task 2: Biome + Husky + lint-staged + commit-msg hook** — `2462101` (chore)
3. **Task 3: Vitest + Playwright + GitHub Actions CI with gitleaks** — `f2e59b0` (chore)

## Files Created/Modified

- `/home/king/Hdiary/package.json` — Monorepo root; scripts delegate to turbo; devDependencies; lint-staged config
- `/home/king/Hdiary/pnpm-workspace.yaml` — Workspace globs (apps/*, packages/*)
- `/home/king/Hdiary/turbo.json` — Pipeline definitions for dev/build/lint/typecheck/test/test:e2e
- `/home/king/Hdiary/tsconfig.base.json` — Strict TS base extended by all packages
- `/home/king/Hdiary/biome.json` — Biome lint+format config (Conventional recommended + strict extras)
- `/home/king/Hdiary/.nvmrc` — Node 20.11.1
- `/home/king/Hdiary/.npmrc` — auto-install-peers, strict-peer-dependencies=false
- `/home/king/Hdiary/.gitignore` — node_modules, .next, dist, .turbo, .env*, coverage, etc.
- `/home/king/Hdiary/.gitattributes` — * text=auto eol=lf
- `/home/king/Hdiary/.editorconfig` — utf-8, lf, 2-space indent
- `/home/king/Hdiary/.husky/pre-commit` — lint-staged + pnpm typecheck
- `/home/king/Hdiary/.husky/commit-msg` — Conventional Commits regex check
- `/home/king/Hdiary/vitest.config.ts` — Root Vitest config (jsdom, v8 coverage, monorepo include)
- `/home/king/Hdiary/playwright.config.ts` — Playwright config → apps/web/e2e, Desktop Chrome
- `/home/king/Hdiary/.gitleaks.toml` — Extend defaults, allowlist .env.example
- `/home/king/Hdiary/.github/workflows/ci.yml` — verify + gitleaks jobs
- `/home/king/Hdiary/apps/web/package.json` — @cited/web stub
- `/home/king/Hdiary/apps/web/tsconfig.json` — Extends base
- `/home/king/Hdiary/apps/web/src/placeholder.ts` — Placeholder (remove in 01-05)
- `/home/king/Hdiary/apps/worker/README.md` — Phase 5 doc-only stub (72 lines)
- `/home/king/Hdiary/packages/db/package.json` — @cited/db stub
- `/home/king/Hdiary/packages/db/tsconfig.json` — Extends base
- `/home/king/Hdiary/packages/db/src/index.ts` — Placeholder export
- `/home/king/Hdiary/packages/core/package.json` — @cited/core stub with `test: vitest run`
- `/home/king/Hdiary/packages/core/tsconfig.json` — Extends base
- `/home/king/Hdiary/packages/core/src/index.ts` — Placeholder export
- `/home/king/Hdiary/packages/core/src/index.test.ts` — Smoke test (1+1=2)
- `/home/king/Hdiary/packages/core/vitest.config.ts` — Local vitest config for per-package runs
- `/home/king/Hdiary/packages/ui/package.json` — @cited/ui stub
- `/home/king/Hdiary/packages/ui/tsconfig.json` — Extends base
- `/home/king/Hdiary/packages/ui/src/index.ts` — Placeholder export
- `/home/king/Hdiary/packages/config/package.json` — @cited/config stub
- `/home/king/Hdiary/packages/config/tsconfig.json` — Extends base
- `/home/king/Hdiary/packages/config/src/index.ts` — Placeholder export
- `/home/king/Hdiary/packages/api-contracts/package.json` — @cited/api-contracts stub
- `/home/king/Hdiary/packages/api-contracts/tsconfig.json` — Extends base
- `/home/king/Hdiary/packages/api-contracts/src/index.ts` — Placeholder export
- `/home/king/Hdiary/pnpm-lock.yaml` — Generated lockfile

## Decisions Made

- **Per-package vitest.config.ts pattern** (deviation): Root vitest include `{apps,packages}/**/*.{test,spec}.{ts,tsx}` resolves from CWD, so running `vitest run` from inside `packages/core/` finds nothing. Added `packages/core/vitest.config.ts` with local `src/**` include. This pattern should be copied to any package that adds tests.
- **apps/web placeholder.ts** (deviation): tsc requires at least one input file to run without TS18003 error. Added `src/placeholder.ts` with `export {}`. Must be removed when Next.js is installed in plan 01-05.
- **Biome ignore extended** (deviation): `.planning/` and `Cited-design-reference/` pre-existed in the repo root and contained JSX/JSON files that failed Biome's lint rules. Added both to `files.ignore` to keep `pnpm lint` clean without touching pre-existing files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tsconfig TS18003 error — apps/web had no TypeScript input files**
- **Found during:** Task 1 (running `pnpm -w typecheck`)
- **Issue:** apps/web/tsconfig.json include pattern `**/*.ts` matched nothing because the directory was empty, causing `error TS18003: No inputs were found`
- **Fix:** Created `apps/web/src/placeholder.ts` with `export {}` to satisfy tsc
- **Files modified:** `apps/web/src/placeholder.ts`
- **Verification:** `pnpm -w typecheck` — all 6 packages pass
- **Committed in:** `8642432` (Task 1 commit)

**2. [Rule 1 - Bug] Biome linting pre-existing files outside monorepo source**
- **Found during:** Task 2 (running `pnpm lint`)
- **Issue:** `.planning/config.json` had formatting issues; `Cited-design-reference/` contained JSX files with lint violations. Neither directory is monorepo source.
- **Fix:** Extended `biome.json` `files.ignore` to include `.planning/**` and `Cited-design-reference/**`
- **Files modified:** `biome.json`
- **Verification:** `pnpm lint` — Checked 26 files, no errors
- **Committed in:** `2462101` (Task 2 commit)

**3. [Rule 1 - Bug] Root vitest include pattern failed for per-package `vitest run` invocations**
- **Found during:** Task 3 (running `pnpm test`)
- **Issue:** `packages/core` used `test: "vitest run"` (no `--passWithNoTests`), but root vitest config's include pattern `{apps,packages}/**/*.{test,spec}.{ts,tsx}` resolves relative to CWD — when invoked from `packages/core/`, it finds no tests and exits 1
- **Fix:** Added `packages/core/vitest.config.ts` with `include: ['src/**/*.{test,spec}.{ts,tsx}']`. Root config remains for workspace-level `pnpm test` runs.
- **Files modified:** `packages/core/vitest.config.ts`
- **Verification:** `pnpm test` — 6/6 packages succeed (1 pass + 5 passWithNoTests)
- **Committed in:** `f2e59b0` (Task 3 commit)

**4. [Rule 1 - Bug] Biome lint error in playwright.config.ts — bracket notation vs dot notation**
- **Found during:** Task 3 (pre-commit hook ran `biome check --write`)
- **Issue:** `process.env['CI']` and `process.env['BASE_URL']` triggered `lint/complexity/useLiteralKeys` — Biome requires dot notation for string literal keys
- **Fix:** Rewrote to `process.env.CI` and `process.env.BASE_URL`
- **Files modified:** `playwright.config.ts`
- **Verification:** `pnpm lint` — clean
- **Committed in:** `f2e59b0` (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 1 — bugs caught during execution)
**Impact on plan:** All fixes necessary for correctness. No scope creep. The per-package vitest.config.ts pattern is a permanent architectural decision that all future packages with tests should follow.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — no external service configuration required for monorepo bootstrap.

## Next Phase Readiness

All Wave-2 plans (01-02 through 01-08) can now plug into a working monorepo:
- **01-02 (OSS legal posture)**: LICENSE, CONTRIBUTING.md, etc. — no code dependency, just add files
- **01-03 (Naming candidates)**: Planning artifact, no code dependency
- **01-04 (Database schema + RLS)**: Install Drizzle + pgvector in `packages/db`, use @cited/api-contracts for Zod schemas
- **01-05 (Next.js skeleton)**: Install Next.js 16 in `apps/web`; remove `src/placeholder.ts`
- **01-06 (Docker Compose + CI smoke)**: Add docker-compose job to `.github/workflows/ci.yml`
- **01-07 (Supabase Auth)**: Implement in `apps/web` using `@supabase/ssr`
- **01-08 (Consent + DOB + disclaimer)**: React Hook Form + Zod, wires into apps/web

No blockers.

---
*Phase: 01-foundation*
*Completed: 2026-05-08*

## Self-Check: PASSED

All required files found on disk. All 3 task commits verified in git log.

| Item | Status |
|------|--------|
| package.json | FOUND |
| pnpm-workspace.yaml | FOUND |
| turbo.json | FOUND |
| tsconfig.base.json | FOUND |
| biome.json | FOUND |
| .husky/pre-commit | FOUND |
| .husky/commit-msg | FOUND |
| vitest.config.ts | FOUND |
| playwright.config.ts | FOUND |
| .github/workflows/ci.yml | FOUND |
| .gitleaks.toml | FOUND |
| apps/worker/README.md | FOUND |
| .planning/phases/01-foundation/01-01-SUMMARY.md | FOUND |
| Commit 8642432 (Task 1) | VERIFIED |
| Commit 2462101 (Task 2) | VERIFIED |
| Commit f2e59b0 (Task 3) | VERIFIED |
