---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - pnpm-workspace.yaml
  - turbo.json
  - tsconfig.base.json
  - biome.json
  - .editorconfig
  - .gitignore
  - .gitattributes
  - .nvmrc
  - .npmrc
  - .husky/pre-commit
  - .husky/commit-msg
  - apps/web/package.json
  - apps/web/tsconfig.json
  - apps/worker/README.md
  - packages/db/package.json
  - packages/db/tsconfig.json
  - packages/db/src/index.ts
  - packages/core/package.json
  - packages/core/tsconfig.json
  - packages/core/src/index.ts
  - packages/ui/package.json
  - packages/ui/tsconfig.json
  - packages/ui/src/index.ts
  - packages/config/package.json
  - packages/config/tsconfig.json
  - packages/config/src/index.ts
  - packages/api-contracts/package.json
  - packages/api-contracts/tsconfig.json
  - packages/api-contracts/src/index.ts
  - .github/workflows/ci.yml
  - vitest.config.ts
  - playwright.config.ts
autonomous: true
requirements: [FND-01, FND-02, FND-03, FND-05, FND-09]
must_haves:
  truths:
    - "A fresh contributor runs `pnpm install && pnpm dev` and the web app boots in under 60 seconds"
    - "`pnpm lint`, `pnpm typecheck`, `pnpm test` all execute via Turborepo against every workspace"
    - "Pre-commit hook auto-formats staged files via Biome and rejects commits that fail typecheck"
    - "`apps/worker/README.md` is the only thing in apps/worker — it is documented as a Phase 5 stub"
    - "GitHub Actions CI runs lint + typecheck + unit tests + gitleaks on every PR"
  artifacts:
    - path: "pnpm-workspace.yaml"
      provides: "Workspace globs for apps/* and packages/*"
      contains: "packages:"
    - path: "turbo.json"
      provides: "Turborepo pipeline definitions"
      contains: "\"tasks\""
    - path: "biome.json"
      provides: "Biome lint+format config"
      contains: "\"$schema\""
    - path: "tsconfig.base.json"
      provides: "Strict TS base config extended by every package"
      contains: "\"strict\": true"
    - path: ".github/workflows/ci.yml"
      provides: "PR CI: install, lint, typecheck, test, gitleaks"
      contains: "gitleaks"
    - path: "apps/worker/README.md"
      provides: "Doc-only stub explaining v0.5/Phase-5 promotion path"
      min_lines: 15
  key_links:
    - from: "package.json"
      to: "turbo.json"
      via: "scripts dev/build/lint/test/typecheck delegate to `turbo run`"
      pattern: "turbo run"
    - from: ".husky/pre-commit"
      to: "biome.json"
      via: "lint-staged invokes `biome check --write`"
      pattern: "biome"
    - from: ".github/workflows/ci.yml"
      to: "turbo.json"
      via: "CI runs `pnpm turbo run lint typecheck test`"
      pattern: "turbo run"
---

<objective>
Bootstrap the pnpm + Turborepo monorepo with strict TypeScript, Biome (lint+format), Husky+lint-staged pre-commit hooks, Vitest + React Testing Library + Playwright wired in CI, and gitleaks secrets scan. Establish the workspace shape: `apps/web`, `apps/worker` (doc-only stub), `packages/db`, `packages/core`, `packages/ui`, `packages/config`, `packages/api-contracts`. After this plan, every other Wave-2/3 plan plugs into a working monorepo.

Purpose: Phase 1 success criterion #1 — fresh contributor `pnpm dev` < 60s. Foundation for all downstream work.
Output: A clonable monorepo with one-command dev, working CI, and locked tooling.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/CLAUDE.md
@/home/king/Hdiary/.planning/PROJECT.md
@/home/king/Hdiary/.planning/ROADMAP.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md

# Locked from CLAUDE.md (do not relitigate)
# - Next.js 16, React 19, Tailwind v4, TS 5.6+ strict
# - pnpm + Turborepo, Biome (NOT ESLint+Prettier)
# - vitest + @testing-library/react, playwright
# - apps/worker = doc-only stub at this phase
# - apps/admin = (admin) route group inside apps/web (NOT separate app)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Workspace skeleton + pnpm + Turborepo + strict TS base</name>
  <files>package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .editorconfig, .gitignore, .gitattributes, .nvmrc, .npmrc, apps/web/package.json, apps/web/tsconfig.json, apps/worker/README.md, packages/db/package.json, packages/db/tsconfig.json, packages/db/src/index.ts, packages/core/package.json, packages/core/tsconfig.json, packages/core/src/index.ts, packages/ui/package.json, packages/ui/tsconfig.json, packages/ui/src/index.ts, packages/config/package.json, packages/config/tsconfig.json, packages/config/src/index.ts, packages/api-contracts/package.json, packages/api-contracts/tsconfig.json, packages/api-contracts/src/index.ts</files>
  <read_first>/home/king/Hdiary/CLAUDE.md, /home/king/Hdiary/.planning/REQUIREMENTS.md</read_first>
  <action>
Create the monorepo skeleton:

1. Root `package.json` (private, name "cited-monorepo", packageManager "pnpm@9.15.0", engines node ">=20.11"). Scripts:
   - "dev": "turbo run dev --parallel"
   - "build": "turbo run build"
   - "lint": "turbo run lint"
   - "typecheck": "turbo run typecheck"
   - "test": "turbo run test"
   - "test:e2e": "turbo run test:e2e"
   - "format": "biome check --write ."
   - "prepare": "husky"
   DevDependencies: turbo@^2, typescript@~5.6, @biomejs/biome@^1.9, husky@^9, lint-staged@^15, vitest@^2, @vitest/ui@^2, @testing-library/react@^16, @testing-library/jest-dom@^6, jsdom@^25, @playwright/test@^1.48, jsonwebtoken@^9 (used by CI compose-smoke job in plan 01-06 to mint deterministic Supabase JWTs).

2. `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"
   ```

3. `turbo.json` (schema https://turbo.build/schema.json) with `tasks`: dev (cache:false, persistent:true), build (dependsOn ["^build"], outputs [".next/**","dist/**"]), lint, typecheck (dependsOn ["^build"]), test, test:e2e (dependsOn ["^build"]).

4. `tsconfig.base.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `target: "ES2022"`, `lib: ["ES2023","DOM","DOM.Iterable"]`, `jsx: "preserve"`, `esModuleInterop: true`, `skipLibCheck: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`, `resolveJsonModule: true`.

5. `.nvmrc`: `20.11.1`. `.npmrc`: `auto-install-peers=true`, `strict-peer-dependencies=false`, `enable-pre-post-scripts=true`.

6. `.gitignore`: node_modules, .next, dist, .turbo, .env*, !.env.example, coverage, playwright-report, test-results, .vercel, .DS_Store, *.log.

7. `.gitattributes`: `* text=auto eol=lf`.

8. `.editorconfig`: utf-8, lf, indent_size 2, insert_final_newline true.

9. Create each package as a workspace with package.json (name `@cited/db`, `@cited/core`, `@cited/ui`, `@cited/config`, `@cited/api-contracts`), `type: "module"`, `main: "./src/index.ts"`, `types: "./src/index.ts"`, `exports: { ".": "./src/index.ts" }`. Each tsconfig.json extends `../../tsconfig.base.json`. Each `src/index.ts` has `export {}` placeholder.

10. `apps/web/package.json`: name `@cited/web`, private true, deps placeholder (Next.js install happens in plan 01-05). For now scripts: `dev: "echo 'web stub — wired in 01-05'"`, `build`, `lint`, `typecheck: "tsc --noEmit"`, `test: "vitest run --passWithNoTests"`. tsconfig extends base.

11. `apps/worker/README.md`: explain this is a doc-only stub for Phase 5. Document the `extraction_jobs` + `clips_pending` job-table contract. Reference `packages/api-contracts` (to be filled in 01-04). State: "DO NOT add code here in Phase 1–4. The worker is promoted to Python (FastAPI + faster-whisper + pyannote) in Phase 5 only."

Run `pnpm install` to verify the workspace resolves cleanly.
  </action>
  <acceptance_criteria>
- `test -f pnpm-workspace.yaml && grep -q "apps/\\*" pnpm-workspace.yaml && grep -q "packages/\\*" pnpm-workspace.yaml`
- `test -f turbo.json && grep -q '"tasks"' turbo.json`
- `grep -q '"strict": true' tsconfig.base.json`
- `grep -q '"noUncheckedIndexedAccess": true' tsconfig.base.json`
- For each pkg in db core ui config api-contracts: `test -f packages/$pkg/package.json && test -f packages/$pkg/tsconfig.json && test -f packages/$pkg/src/index.ts`
- `test -f apps/worker/README.md && ! find apps/worker -type f -name '*.ts' -o -name '*.js' -o -name '*.py' | grep .` (only README, no code files)
- `wc -l apps/worker/README.md | awk '{print $1}'` ≥ 15
- `pnpm install` exits 0
- `pnpm -w typecheck` exits 0
  </acceptance_criteria>
  <done>Monorepo installs cleanly; turbo pipelines defined; six packages + two apps recognized as workspaces; worker is doc-only.</done>
</task>

<task type="auto">
  <name>Task 2: Biome + Husky + lint-staged + commit-msg conventional-commit check</name>
  <files>biome.json, .husky/pre-commit, .husky/commit-msg, package.json</files>
  <read_first>/home/king/Hdiary/CLAUDE.md, /home/king/Hdiary/package.json (after Task 1)</read_first>
  <action>
1. Create `biome.json` (schema https://biomejs.dev/schemas/1.9.4/schema.json):
   - `organizeImports: { enabled: true }`
   - `linter: { enabled: true, rules: { recommended: true, suspicious: { noExplicitAny: "error" }, correctness: { noUnusedVariables: "error", noUnusedImports: "error" }, style: { useImportType: "error", useNodejsImportProtocol: "error" } } }`
   - `formatter: { enabled: true, indentStyle: "space", indentWidth: 2, lineWidth: 100, lineEnding: "lf" }`
   - `javascript: { formatter: { quoteStyle: "single", semicolons: "always", trailingCommas: "all", arrowParentheses: "always" } }`
   - `files: { ignore: ["**/.next/**","**/dist/**","**/node_modules/**","**/.turbo/**","**/playwright-report/**","**/coverage/**","pnpm-lock.yaml"] }`

2. Add to root `package.json` `lint-staged` field:
   ```json
   "lint-staged": {
     "*.{ts,tsx,js,jsx,json,md}": ["biome check --write --no-errors-on-unmatched"]
   }
   ```
   Add scripts `lint: "biome check ."`, `lint:fix: "biome check --write ."`.

3. Initialize Husky: run `pnpm dlx husky init` equivalent — create `.husky/` dir.

4. `.husky/pre-commit`:
   ```sh
   pnpm exec lint-staged
   pnpm -w typecheck
   ```

5. `.husky/commit-msg` (conventional commits sanity check, no extra dep):
   ```sh
   msg_file="$1"
   first_line=$(head -n1 "$msg_file")
   if ! echo "$first_line" | grep -qE '^(feat|fix|refactor|docs|test|chore|perf|ci|build|style)(\([a-z0-9_-]+\))?!?: .+'; then
     echo "Commit message must follow Conventional Commits (feat|fix|refactor|docs|test|chore|perf|ci|build|style): subject"
     exit 1
   fi
   ```

6. Make hook files executable (`chmod +x .husky/pre-commit .husky/commit-msg`).

Verify: `pnpm lint` runs Biome cleanly on the empty workspace.
  </action>
  <acceptance_criteria>
- `test -f biome.json && grep -q '"recommended": true' biome.json`
- `grep -q '"noExplicitAny": "error"' biome.json`
- `test -x .husky/pre-commit && grep -q "lint-staged" .husky/pre-commit && grep -q "typecheck" .husky/pre-commit`
- `test -x .husky/commit-msg && grep -q "Conventional Commits" .husky/commit-msg`
- `grep -q '"lint-staged"' package.json`
- `pnpm lint` exits 0 (Biome runs, no errors on placeholder files)
- Test commit-msg hook: `echo "bad message" > /tmp/m && .husky/commit-msg /tmp/m` exits non-zero
- Test commit-msg hook: `echo "feat(foo): bar" > /tmp/m && .husky/commit-msg /tmp/m` exits 0
  </acceptance_criteria>
  <done>Biome lints+formats; pre-commit auto-formats and typechecks; commit-msg enforces conventional commits.</done>
</task>

<task type="auto">
  <name>Task 3: Vitest + Playwright wiring + GitHub Actions CI with gitleaks</name>
  <files>vitest.config.ts, playwright.config.ts, .github/workflows/ci.yml, .gitleaks.toml</files>
  <read_first>/home/king/Hdiary/CLAUDE.md, /home/king/Hdiary/turbo.json (from Task 1)</read_first>
  <action>
1. Root `vitest.config.ts`:
   ```ts
   import { defineConfig } from 'vitest/config';
   export default defineConfig({
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: [],
       coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
       include: ['{apps,packages}/**/*.{test,spec}.{ts,tsx}'],
       exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/e2e/**'],
     },
   });
   ```

2. Root `playwright.config.ts`:
   ```ts
   import { defineConfig, devices } from '@playwright/test';
   export default defineConfig({
     testDir: './apps/web/e2e',
     fullyParallel: true,
     retries: process.env.CI ? 2 : 0,
     reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
     use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000', trace: 'on-first-retry' },
     projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
     webServer: process.env.CI ? undefined : { command: 'pnpm --filter @cited/web dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
   });
   ```

3. `.gitleaks.toml`: extend default with allowlist for `apps/web/.env.example`. Use:
   ```toml
   [extend]
   useDefault = true
   [allowlist]
   description = "Example env files"
   paths = ['''(.*?)\.env\.example$''']
   ```

4. `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on:
     pull_request:
     push:
       branches: [main]
   permissions:
     contents: read
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   jobs:
     verify:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           with: { fetch-depth: 0 }
         - uses: pnpm/action-setup@v4
           with: { version: 9.15.0 }
         - uses: actions/setup-node@v4
           with: { node-version-file: '.nvmrc', cache: 'pnpm' }
         - run: pnpm install --frozen-lockfile
         - run: pnpm turbo run lint typecheck test --concurrency=2
     gitleaks:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           with: { fetch-depth: 0 }
         - uses: gitleaks/gitleaks-action@v2
           env:
             GITLEAKS_CONFIG: .gitleaks.toml
   ```

5. Add a smoke test to prove the pipeline: `packages/core/src/index.test.ts` with `import { describe, it, expect } from 'vitest'; describe('smoke', () => { it('runs', () => { expect(1+1).toBe(2); }); });` and add `test: "vitest run"` to packages/core/package.json.

Note: docker-compose CI smoke (FND-04) is in plan 01-06 and adds a separate job to this workflow.
  </action>
  <acceptance_criteria>
- `test -f vitest.config.ts && grep -q "jsdom" vitest.config.ts`
- `test -f playwright.config.ts && grep -q "apps/web/e2e" playwright.config.ts`
- `test -f .github/workflows/ci.yml`
- `grep -q "pnpm turbo run lint typecheck test" .github/workflows/ci.yml`
- `grep -q "gitleaks" .github/workflows/ci.yml`
- `test -f .gitleaks.toml && grep -q "useDefault = true" .gitleaks.toml`
- `pnpm test` exits 0 and reports the smoke test passing (1 test, 1 pass)
- `npx playwright --version` resolves (config syntactically valid)
  </acceptance_criteria>
  <done>Vitest runs from any package; Playwright config valid; CI workflow runs verify + gitleaks jobs; smoke test passes.</done>
</task>

</tasks>

<verification>
Run from repo root:
1. `rm -rf node_modules && pnpm install --frozen-lockfile` — completes without errors
2. `pnpm lint` — Biome reports clean
3. `pnpm typecheck` — all packages pass
4. `pnpm test` — smoke test passes
5. `time pnpm install` (warm cache) — under 60 seconds for FND-03 budget
6. `git commit` with bad message rejected by commit-msg hook
7. CI job appears on next PR (verify by pushing a branch)
</verification>

<success_criteria>
- All 7 workspace dirs exist (apps/web, apps/worker, packages/{db,core,ui,config,api-contracts})
- `apps/worker/` contains only README.md (no .ts/.js/.py files)
- Biome+Husky+lint-staged enforce style/typecheck on every commit
- Vitest + Playwright config files valid
- CI workflow runs verify + gitleaks on every PR
- All 5 requirements (FND-01, FND-02, FND-03, FND-05, FND-09) satisfied
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-01-SUMMARY.md` documenting:
- Final pnpm + turbo + biome + node versions installed
- Workspace shape (which packages/apps are wired in)
- CI workflow URL/path and what gates it enforces
- Anything Wave-2 plans (01-04, 01-05, 01-06) need to know about the scaffolding (especially `@cited/db`, `@cited/api-contracts` package names)
</output>
