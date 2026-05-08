---
phase: 01-foundation
plan: 05
type: execute
wave: 2
depends_on: [01-01-monorepo-bootstrap-PLAN.md]
files_modified:
  - apps/web/package.json
  - apps/web/tsconfig.json
  - apps/web/next.config.ts
  - apps/web/postcss.config.mjs
  - apps/web/components.json
  - apps/web/app/globals.css
  - apps/web/app/layout.tsx
  - apps/web/app/page.tsx
  - apps/web/app/(marketing)/layout.tsx
  - apps/web/app/(auth)/layout.tsx
  - apps/web/app/(auth)/login/page.tsx
  - apps/web/app/(app)/layout.tsx
  - apps/web/app/(app)/dashboard/page.tsx
  - apps/web/app/(admin)/layout.tsx
  - apps/web/app/(admin)/page.tsx
  - apps/web/app/(admin)/clips/page.tsx
  - apps/web/lib/auth/guards.ts
  - apps/web/lib/env.ts
  - apps/web/components/ui/button.tsx
  - apps/web/components/ui/input.tsx
  - apps/web/components/ui/label.tsx
  - apps/web/components/ui/card.tsx
  - apps/web/components/disclaimer-banner.tsx
  - apps/web/.env.example
  - apps/web/biome.json
  - apps/web/e2e/smoke.spec.ts
autonomous: true
requirements: [ADMN-01, ADMN-02, PROF-02]
must_haves:
  truths:
    - "`pnpm --filter @cited/web dev` boots Next.js 16 + React 19 + Tailwind v4 on http://localhost:3000"
    - "Public surface includes a `/` landing and a `/login` page using shadcn/ui components"
    - "An (admin) route group exists with its own layout that gates entry on profiles.role in ('curator','admin')"
    - "An (app) route group exists with its own layout that gates entry on a valid Supabase session"
    - "A profile-edit settings stub exists where the user can change displayName, timezone, privacyMode (PROF-02)"
    - "A health disclaimer banner component renders in the (app) layout (Phase 1 plumbing for LGL-01)"
    - "A custom Biome lint rule (or comment-pinned ESLint rule equivalent) bans direct @ai-sdk imports outside packages/core/llm — enforces AION-09"
    - "A Playwright smoke spec verifies the landing and login pages render"
  artifacts:
    - path: "apps/web/next.config.ts"
      provides: "Next.js 16 config — strict mode, transpilePackages for monorepo"
      contains: "transpilePackages"
    - path: "apps/web/components.json"
      provides: "shadcn/ui CLI config (Tailwind v4, RSC, CSS vars)"
      contains: "tailwind"
    - path: "apps/web/app/(admin)/layout.tsx"
      provides: "Admin route group with curator/admin gate"
      contains: "curator"
    - path: "apps/web/lib/auth/guards.ts"
      provides: "requireUser() and requireCurator() server helpers"
      exports: ["requireUser", "requireCurator"]
    - path: "apps/web/.env.example"
      provides: "Env keys: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY"
      contains: "NEXT_PUBLIC_SUPABASE_URL"
  key_links:
    - from: "apps/web/app/(admin)/layout.tsx"
      to: "apps/web/lib/auth/guards.ts"
      via: "calls requireCurator() in the layout server component"
      pattern: "requireCurator"
    - from: "apps/web/app/(app)/layout.tsx"
      to: "apps/web/lib/auth/guards.ts"
      via: "calls requireUser() in the layout server component"
      pattern: "requireUser"
    - from: "apps/web/app/globals.css"
      to: "tailwindcss"
      via: "@import 'tailwindcss' (v4 CSS-first)"
      pattern: "@import 'tailwindcss'"
---

<objective>
Stand up the `apps/web` Next.js 16 + React 19 + Tailwind v4 application skeleton with three route groups: `(marketing)` (public), `(auth)` (login flow), `(app)` (logged-in user surface), and `(admin)` (curator-gated). Initialize shadcn/ui under Tailwind v4. Land the auth-guard helpers (stubs in this plan; wired in 01-07) and the profile-edit settings stub (PROF-02). Produce the disclaimer-banner component (Phase 1 plumbing for LGL-01; rendered everywhere relevant in Phase 3).

Purpose: Phase 1 success criteria #1 (`pnpm dev` < 60s to login page) and the structural pieces for ADMN-01 (admin-as-route-group, NOT separate app), ADMN-02 (curator role exists in schema and route gate), PROF-02 (profile edit). Mitigates Pitfall 9 (premature monorepo / `apps/admin`).
Output: A bootable Next.js app with route groups, layout gates, shadcn/ui primitives, and a passing Playwright smoke test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/CLAUDE.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-01-SUMMARY.md

# Locked stack (CLAUDE.md):
# - Next.js 16 App Router, React 19, Tailwind v4 (Oxide), TS 5.6+ strict
# - shadcn/ui latest CLI (copy-paste, NOT a runtime dep)
# - @supabase/ssr is the canonical App Router auth integration (added in 01-07)
# - apps/admin = (admin) route group inside apps/web (NOT a separate app)

# This plan does NOT wire up Supabase Auth — that's 01-07. Auth-guard helpers throw
# placeholder errors in this plan; 01-07 fills them in. The route group layouts call
# the helpers so the integration point is structurally locked.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui init + env scaffolding</name>
  <files>apps/web/package.json, apps/web/tsconfig.json, apps/web/next.config.ts, apps/web/postcss.config.mjs, apps/web/components.json, apps/web/app/globals.css, apps/web/app/layout.tsx, apps/web/app/page.tsx, apps/web/.env.example, apps/web/biome.json, apps/web/components/ui/button.tsx, apps/web/components/ui/input.tsx, apps/web/components/ui/label.tsx, apps/web/components/ui/card.tsx, apps/web/lib/env.ts</files>
  <read_first>/home/king/Hdiary/CLAUDE.md, /home/king/Hdiary/.planning/phases/01-foundation/01-01-SUMMARY.md, /home/king/Hdiary/turbo.json</read_first>
  <action>
1. `apps/web/package.json`:
   - name: `@cited/web`, private: true, type: "module"
   - scripts: `dev: "next dev --turbopack -p 3000"`, `build: "next build"`, `start: "next start"`, `lint: "biome check ."`, `typecheck: "tsc --noEmit"`, `test: "vitest run --passWithNoTests"`, `test:e2e: "playwright test"`
   - deps: `next@^16`, `react@^19`, `react-dom@^19`, `@cited/db: workspace:*`, `@cited/core: workspace:*`, `@cited/ui: workspace:*`, `@cited/api-contracts: workspace:*`, `@cited/config: workspace:*`, `class-variance-authority@^0.7`, `clsx@^2`, `tailwind-merge@^2`, `lucide-react`, `zod@^3.23`
   - devDeps: `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `postcss@^8`, `@types/node`, `@types/react`, `@types/react-dom`

2. `apps/web/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "plugins": [{ "name": "next" }],
       "paths": { "@/*": ["./*"] },
       "incremental": true,
       "noEmit": true
     },
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules", ".next"]
   }
   ```

3. `apps/web/next.config.ts`:
   ```ts
   import type { NextConfig } from 'next';
   const config: NextConfig = {
     reactStrictMode: true,
     transpilePackages: ['@cited/db','@cited/core','@cited/ui','@cited/api-contracts','@cited/config'],
     experimental: { typedRoutes: true },
     async headers() {
       return [{
         source: '/:path*',
         headers: [
           { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, // LGL-07
           { key: 'X-Content-Type-Options', value: 'nosniff' },
           { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
         ],
       }];
     },
   };
   export default config;
   ```

4. `apps/web/postcss.config.mjs`:
   ```js
   export default { plugins: { '@tailwindcss/postcss': {} } };
   ```

5. `apps/web/app/globals.css` (Tailwind v4 CSS-first):
   ```css
   @import 'tailwindcss';

   @theme {
     --color-background: oklch(1 0 0);
     --color-foreground: oklch(0.145 0 0);
     --color-primary: oklch(0.205 0 0);
     --color-primary-foreground: oklch(0.985 0 0);
     --color-muted: oklch(0.97 0 0);
     --color-muted-foreground: oklch(0.556 0 0);
     --color-border: oklch(0.922 0 0);
     --radius: 0.5rem;
   }

   @media (prefers-color-scheme: dark) {
     @theme {
       --color-background: oklch(0.145 0 0);
       --color-foreground: oklch(0.985 0 0);
     }
   }

   body { background: var(--color-background); color: var(--color-foreground); }
   ```

6. `apps/web/components.json` (shadcn/ui CLI config — locked for `npx shadcn@latest add`):
   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "default",
     "rsc": true,
     "tsx": true,
     "tailwind": {
       "config": "",
       "css": "app/globals.css",
       "baseColor": "neutral",
       "cssVariables": true
     },
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/utils",
       "ui": "@/components/ui",
       "hooks": "@/hooks"
     },
     "iconLibrary": "lucide"
   }
   ```

7. `apps/web/lib/utils.ts`:
   ```ts
   import { clsx, type ClassValue } from 'clsx';
   import { twMerge } from 'tailwind-merge';
   export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
   ```

8. Add 4 shadcn primitives via `npx shadcn@latest add button input label card --yes`. If non-interactive add fails, hand-write the canonical shadcn versions of `button.tsx`, `input.tsx`, `label.tsx`, `card.tsx` into `apps/web/components/ui/` (these are deterministic, copy from https://ui.shadcn.com/docs/components — no innovation needed).

9. `apps/web/app/layout.tsx`:
   ```tsx
   import './globals.css';
   import type { Metadata } from 'next';
   export const metadata: Metadata = { title: 'Cited', description: 'Habits backed by people who study this for a living.' };
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return <html lang="en"><body className="min-h-screen antialiased">{children}</body></html>;
   }
   ```

10. `apps/web/app/page.tsx` (marketing landing — minimal):
    ```tsx
    import Link from 'next/link';
    import { Button } from '@/components/ui/button';
    export default function HomePage() {
      return (
        <main className="mx-auto max-w-2xl p-8 space-y-6">
          <h1 className="text-3xl font-semibold">Cited</h1>
          <p className="text-muted-foreground">Habits backed by people who study this for a living. Pre-alpha.</p>
          <Button asChild><Link href="/login">Sign in</Link></Button>
        </main>
      );
    }
    ```

11. `apps/web/lib/env.ts` — zod-validated env loader (fail-fast at startup):
    ```ts
    import { z } from 'zod';
    const Env = z.object({
      NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(), // server-only
      DATABASE_URL: z.string().url().optional(),
      OPENAI_API_KEY: z.string().min(20).optional(),
      ANTHROPIC_API_KEY: z.string().min(20).optional(),
    });
    export const env = Env.parse(process.env);
    ```

12. `apps/web/.env.example`:
    ```
    # Public — exposed to browser
    NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-me

    # Server-only — never commit real values
    SUPABASE_SERVICE_ROLE_KEY=replace-me
    DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres
    OPENAI_API_KEY=
    ANTHROPIC_API_KEY=
    ```

13. `apps/web/biome.json` extending root:
    ```json
    {
      "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
      "extends": ["../../biome.json"],
      "linter": {
        "rules": {
          "nursery": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "paths": {
                  "@ai-sdk/openai": "Use packages/core/llm wrappers (AION-09).",
                  "@ai-sdk/anthropic": "Use packages/core/llm wrappers (AION-09).",
                  "openai": "Use packages/core/llm wrappers (AION-09).",
                  "@anthropic-ai/sdk": "Use packages/core/llm wrappers (AION-09)."
                }
              }
            }
          }
        }
      }
    }
    ```
    (If Biome's noRestrictedImports rule semantics differ in 1.9, fall back to a comment in `apps/web/README.md` plus a CI grep step in `.github/workflows/ci.yml` checking `! grep -rE "from '@ai-sdk/(openai|anthropic)'" apps/web/app apps/web/lib`. Either mechanism satisfies AION-09 enforcement; pick the working one.)

Run `pnpm --filter @cited/web dev` once to verify it boots and `/` renders.
  </action>
  <acceptance_criteria>
- `test -f apps/web/next.config.ts && grep -q "transpilePackages" apps/web/next.config.ts && grep -q "Referrer-Policy" apps/web/next.config.ts`
- `grep -q "@import 'tailwindcss'" apps/web/app/globals.css`
- `test -f apps/web/components.json && grep -q '"baseColor": "neutral"' apps/web/components.json`
- For each in button input label card: `test -f apps/web/components/ui/$comp.tsx`
- `test -f apps/web/lib/env.ts && grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/lib/env.ts`
- `test -f apps/web/.env.example && grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.example && grep -q "OPENAI_API_KEY" apps/web/.env.example`
- AION-09 enforcement: either `grep -q "noRestrictedImports" apps/web/biome.json` OR a CI grep step in `.github/workflows/ci.yml` blocking direct `@ai-sdk/(openai|anthropic)` imports under `apps/web/`
- `pnpm --filter @cited/web build` exits 0
- `pnpm --filter @cited/web typecheck` exits 0
- `curl -s http://localhost:3000 | grep -q "Cited"` after `pnpm --filter @cited/web dev`
  </acceptance_criteria>
  <done>Next.js 16 app boots, Tailwind v4 working, shadcn primitives in place, env validated at startup, AION-09 enforcement active.</done>
</task>

<task type="auto">
  <name>Task 2: Route groups — (marketing) / (auth) / (app) / (admin) with stub auth guards</name>
  <files>apps/web/app/(marketing)/layout.tsx, apps/web/app/(auth)/layout.tsx, apps/web/app/(auth)/login/page.tsx, apps/web/app/(app)/layout.tsx, apps/web/app/(app)/dashboard/page.tsx, apps/web/app/(app)/settings/page.tsx, apps/web/app/(admin)/layout.tsx, apps/web/app/(admin)/page.tsx, apps/web/app/(admin)/clips/page.tsx, apps/web/lib/auth/guards.ts, apps/web/components/disclaimer-banner.tsx</files>
  <read_first>apps/web/app/layout.tsx (Task 1), packages/db/src/schema/profiles.ts</read_first>
  <action>
1. `apps/web/lib/auth/guards.ts` (server-only stubs; 01-07 fills in the body):
   ```ts
   import 'server-only';
   import { redirect } from 'next/navigation';
   export type SessionUser = { id: string; email: string; role: 'user'|'curator'|'admin' };

   /**
    * Resolves the current Supabase session user + their profile.role.
    * Returns null if not signed in.
    *
    * Implementation deferred to plan 01-07 (Supabase Auth wiring).
    * This stub returns null so the route guards behave as "not signed in" until 01-07.
    */
   export async function getSessionUser(): Promise<SessionUser | null> {
     // TODO(01-07): replace with @supabase/ssr createServerClient + db role lookup
     return null;
   }

   export async function requireUser(): Promise<SessionUser> {
     const user = await getSessionUser();
     if (!user) redirect('/login');
     return user;
   }

   export async function requireCurator(): Promise<SessionUser> {
     const user = await getSessionUser();
     if (!user) redirect('/login');
     if (user.role !== 'curator' && user.role !== 'admin') redirect('/dashboard');
     return user;
   }
   ```

2. `apps/web/app/(marketing)/layout.tsx`:
   ```tsx
   export default function MarketingLayout({ children }: { children: React.ReactNode }) {
     return <div className="mx-auto max-w-4xl">{children}</div>;
   }
   ```

3. `apps/web/app/(auth)/layout.tsx`: minimal centered layout for login flow.

4. `apps/web/app/(auth)/login/page.tsx`:
   ```tsx
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   export default function LoginPage() {
     return (
       <main className="min-h-screen flex items-center justify-center p-8">
         <Card className="w-full max-w-md">
           <CardHeader><CardTitle>Sign in to Cited</CardTitle></CardHeader>
           <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground">Magic link + Google OAuth wire-up lands in plan 01-07.</p>
             <Button disabled className="w-full">Continue with email (coming soon)</Button>
             <Button disabled variant="outline" className="w-full">Continue with Google (coming soon)</Button>
           </CardContent>
         </Card>
       </main>
     );
   }
   ```

5. `apps/web/components/disclaimer-banner.tsx` (Phase 1 plumbing for LGL-01):
   ```tsx
   export function DisclaimerBanner() {
     return (
       <div role="region" aria-label="Health disclaimer" className="border-b bg-muted px-4 py-2 text-xs text-muted-foreground">
         Cited is not medical advice. Consult a qualified healthcare professional before changing health habits.
       </div>
     );
   }
   ```

6. `apps/web/app/(app)/layout.tsx` (gated):
   ```tsx
   import { requireUser } from '@/lib/auth/guards';
   import { DisclaimerBanner } from '@/components/disclaimer-banner';
   export default async function AppLayout({ children }: { children: React.ReactNode }) {
     await requireUser();
     return (
       <div>
         <DisclaimerBanner />
         <div className="mx-auto max-w-5xl p-6">{children}</div>
       </div>
     );
   }
   ```

7. `apps/web/app/(app)/dashboard/page.tsx`: stub.
   ```tsx
   import { requireUser } from '@/lib/auth/guards';
   export default async function DashboardPage() {
     const user = await requireUser();
     return <div><h1 className="text-2xl font-semibold">Welcome</h1><p className="text-sm text-muted-foreground mt-2">Habits dashboard ships in Phase 3.</p></div>;
   }
   ```

8. `apps/web/app/(app)/settings/page.tsx` (PROF-02 — profile edit stub):
   ```tsx
   import { requireUser } from '@/lib/auth/guards';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';
   import { Button } from '@/components/ui/button';
   export default async function SettingsPage() {
     await requireUser();
     // TODO(01-07): server action to update profiles table — for now this is a non-interactive stub
     return (
       <form className="space-y-4 max-w-md">
         <h1 className="text-2xl font-semibold">Settings</h1>
         <div className="space-y-2"><Label htmlFor="display_name">Display name</Label><Input id="display_name" name="display_name" /></div>
         <div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" defaultValue="UTC" /></div>
         <div className="space-y-2"><Label htmlFor="privacy_mode">Privacy mode</Label>
           <select id="privacy_mode" name="privacy_mode" className="w-full border rounded px-3 py-2">
             <option value="private">Private</option><option value="public">Public</option>
           </select>
         </div>
         <Button type="submit" disabled>Save (server action lands in 01-07)</Button>
       </form>
     );
   }
   ```

9. `apps/web/app/(admin)/layout.tsx` (ADMN-01 — admin route group with role gate):
   ```tsx
   import { requireCurator } from '@/lib/auth/guards';
   import Link from 'next/link';
   export default async function AdminLayout({ children }: { children: React.ReactNode }) {
     const user = await requireCurator();
     return (
       <div>
         <header className="border-b bg-muted px-4 py-2 text-sm flex gap-4">
           <span className="font-semibold">Admin</span>
           <Link href="/admin">Home</Link>
           <Link href="/admin/clips">Clips</Link>
           <span className="ml-auto text-muted-foreground">{user.email} ({user.role})</span>
         </header>
         <div className="mx-auto max-w-6xl p-6">{children}</div>
       </div>
     );
   }
   ```

10. `apps/web/app/(admin)/page.tsx` and `apps/web/app/(admin)/clips/page.tsx`: minimal stubs ("Curation tooling lands in Phase 2 — see ROADMAP Phase 2 ADMN-03..16").

Note on URL paths: the parenthesized segments are route groups (no URL effect). `(admin)/page.tsx` → `/admin` requires either renaming the directory or adding `apps/web/app/(admin)/admin/page.tsx`. CHOOSE the latter for clarity: nested `app/(admin)/admin/page.tsx` and `app/(admin)/admin/clips/page.tsx` so URLs are `/admin` and `/admin/clips`. Same pattern for (app): use `app/(app)/(authed)/dashboard/page.tsx` is ugly — instead, place pages directly:
- `app/(app)/dashboard/page.tsx` → `/dashboard`
- `app/(app)/settings/page.tsx` → `/settings`
- `app/(admin)/admin/page.tsx` → `/admin`
- `app/(admin)/admin/clips/page.tsx` → `/admin/clips`

Adjust file paths above accordingly. The route groups exist to apply DIFFERENT layouts (`(app)` layout has user gate; `(admin)` layout has curator gate); the URL structure is determined by inner directory names.
  </action>
  <acceptance_criteria>
- `test -f apps/web/lib/auth/guards.ts && grep -q "requireUser" apps/web/lib/auth/guards.ts && grep -q "requireCurator" apps/web/lib/auth/guards.ts && grep -q "'server-only'" apps/web/lib/auth/guards.ts`
- `grep -q "user.role !== 'curator' && user.role !== 'admin'" apps/web/lib/auth/guards.ts`
- `test -f "apps/web/app/(admin)/layout.tsx" && grep -q "requireCurator" "apps/web/app/(admin)/layout.tsx"`
- `test -f "apps/web/app/(app)/layout.tsx" && grep -q "requireUser" "apps/web/app/(app)/layout.tsx"`
- `test -f "apps/web/app/(auth)/login/page.tsx" && grep -qi "Sign in" "apps/web/app/(auth)/login/page.tsx"`
- `test -f "apps/web/app/(app)/settings/page.tsx" && grep -q "display_name" "apps/web/app/(app)/settings/page.tsx" && grep -q "timezone" "apps/web/app/(app)/settings/page.tsx" && grep -q "privacy_mode" "apps/web/app/(app)/settings/page.tsx"`
- `test -f apps/web/components/disclaimer-banner.tsx && grep -qi "not medical advice" apps/web/components/disclaimer-banner.tsx`
- Visiting `/dashboard` while signed-out redirects to `/login` (verified by Playwright spec in Task 3)
- Visiting `/admin` while signed-out redirects to `/login` (verified by Playwright spec in Task 3)
  </acceptance_criteria>
  <done>Four route groups in place; layout gates call the (stubbed) requireUser/requireCurator helpers; settings stub covers PROF-02 fields.</done>
</task>

<task type="auto">
  <name>Task 3: Playwright smoke spec — landing renders, login renders, gated routes redirect</name>
  <files>apps/web/e2e/smoke.spec.ts</files>
  <read_first>playwright.config.ts (root), apps/web/app/page.tsx, apps/web/app/(auth)/login/page.tsx</read_first>
  <action>
1. `apps/web/e2e/smoke.spec.ts`:
   ```ts
   import { test, expect } from '@playwright/test';

   test('landing page renders', async ({ page }) => {
     await page.goto('/');
     await expect(page.getByRole('heading', { name: 'Cited' })).toBeVisible();
     await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
   });

   test('login page renders', async ({ page }) => {
     await page.goto('/login');
     await expect(page.getByText(/sign in to cited/i)).toBeVisible();
   });

   test('dashboard redirects when signed out', async ({ page }) => {
     await page.goto('/dashboard');
     await expect(page).toHaveURL(/\/login$/);
   });

   test('admin redirects when signed out', async ({ page }) => {
     await page.goto('/admin');
     await expect(page).toHaveURL(/\/login$/);
   });
   ```

2. Add Playwright to `apps/web/package.json` devDependencies if not already present at the root level.
  </action>
  <acceptance_criteria>
- `test -f apps/web/e2e/smoke.spec.ts && grep -q "landing page renders" apps/web/e2e/smoke.spec.ts && grep -q "redirects when signed out" apps/web/e2e/smoke.spec.ts`
- `pnpm --filter @cited/web exec playwright install chromium` exits 0
- `pnpm --filter @cited/web test:e2e` runs all 4 tests and they pass against `pnpm dev`
  </acceptance_criteria>
  <done>Four Playwright tests verify the route group + redirect behavior end-to-end.</done>
</task>

</tasks>

<verification>
1. `pnpm --filter @cited/web typecheck && pnpm --filter @cited/web build` exits 0
2. `pnpm --filter @cited/web dev` boots in <10s; visit http://localhost:3000 — sees "Cited"; click "Sign in" → /login
3. `curl -sI http://localhost:3000 | grep -i "referrer-policy: strict-origin-when-cross-origin"`
4. `pnpm --filter @cited/web test:e2e` — 4 tests pass
5. Try direct `@ai-sdk/openai` import in `apps/web/app/page.tsx` and run `pnpm --filter @cited/web lint` — must error
</verification>

<success_criteria>
- 3 requirements satisfied (ADMN-01 admin route group + curator gate; ADMN-02 curator role used by gate; PROF-02 settings stub)
- App boots in <10s with `pnpm --filter @cited/web dev`
- Tailwind v4 + shadcn/ui working
- Auth-guard helpers exist with the integration shape 01-07 will fill in
- AION-09 enforcement (lint or CI grep) blocks direct LLM-SDK imports outside packages/core/llm
- Disclaimer-banner component lands as Phase 1 plumbing for LGL-01
- 4 Playwright smoke tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-05-SUMMARY.md` documenting:
- Route group layout: which group has which guard
- Where 01-07 must edit (`lib/auth/guards.ts` getSessionUser body)
- shadcn components added so Phase 2/3 can `npx shadcn add` more without re-init
- Outstanding hooks (settings server action, login form action, login OAuth button)
</output>
