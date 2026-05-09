---
phase: 01-foundation
plan: 07
subsystem: auth
tags: [supabase-auth, supabase-ssr, magic-link, google-oauth, drizzle, nextjs, middleware, e2e]

# Dependency graph
requires:
  - phase: 01-foundation
    plan: 04
    provides: "profiles table + RLS policies + createDb client"
  - phase: 01-foundation
    plan: 05
    provides: "Next.js skeleton + route groups + auth guards stub"
  - phase: 01-foundation
    plan: 06
    provides: "docker-compose stack with GoTrue (MAILER_AUTOCONFIRM=true)"

provides:
  - createServerSupabaseClient (apps/web/lib/supabase/server.ts) — App Router server-side Supabase client
  - createBrowserSupabaseClient (apps/web/lib/supabase/client.ts) — browser Supabase client
  - updateSession (apps/web/lib/supabase/middleware.ts) — session refresh middleware helper
  - Root Next.js middleware (apps/web/middleware.ts) — calls updateSession on all non-static routes
  - /auth/callback route handler — magic-link + OAuth code exchange
  - /auth/sign-out POST route handler — clears session
  - Real getSessionUser() + requireUser() + requireCurator() in lib/auth/guards.ts
  - signInWithMagicLink + signInWithGoogle server actions
  - LoginForm client component with useActionState
  - updateProfile server action (PROF-02 settings)
  - SettingsForm client component
  - Playwright E2E auth.spec.ts — magic-link round-trip against local GoTrue

affects: [01-08, 02-admn, 03-hab-rec-aion, 04-launch]

# Tech tracking
tech-stack:
  added:
    - "@supabase/ssr@^0.5 (canonical Next.js App Router Supabase client)"
    - "@supabase/supabase-js@^2"
  patterns:
    - createServerSupabaseClient for all server-side Supabase access (Server Components, Route Handlers, Server Actions)
    - createBrowserSupabaseClient for client component Supabase access
    - updateSession middleware pattern — call supabase.auth.getUser() on every request to refresh cookies
    - Import drizzle operators (eq, and, etc.) from @cited/db re-exports to avoid drizzle-orm dual-instance type conflicts
    - useActionState hook for form-based server actions (Next.js 19 React)
    - void-returning wrapper function for redirect-based server actions used in form.action (Google OAuth)

key-files:
  created:
    - apps/web/lib/supabase/server.ts (createServerSupabaseClient)
    - apps/web/lib/supabase/client.ts (createBrowserSupabaseClient)
    - apps/web/lib/supabase/middleware.ts (updateSession)
    - apps/web/middleware.ts (root Next.js middleware)
    - apps/web/app/auth/callback/route.ts (code exchange handler)
    - apps/web/app/auth/sign-out/route.ts (sign-out handler)
    - apps/web/app/(auth)/login/actions.ts (signInWithMagicLink + signInWithGoogle)
    - apps/web/app/(auth)/login/login-form.tsx (LoginForm client component)
    - apps/web/app/(app)/settings/actions.ts (updateProfile server action)
    - apps/web/app/(app)/settings/settings-form.tsx (SettingsForm client component)
    - apps/web/e2e/auth.spec.ts (Playwright magic-link E2E)
  modified:
    - apps/web/lib/auth/guards.ts (replaced stub with real @supabase/ssr + Drizzle implementation)
    - apps/web/app/(auth)/login/page.tsx (replaced stub with real LoginForm + redirect-if-signed-in)
    - apps/web/app/(app)/settings/page.tsx (replaced stub with profile-reading + SettingsForm)
    - apps/web/package.json (added @supabase/ssr + @supabase/supabase-js)
    - packages/db/src/index.ts (added re-exports: eq, and, or, not, isNull, etc.)
    - package.json (added pnpm drizzle-orm override to deduplicate instances)
    - apps/web/e2e/legal-gate.spec.ts (fixed TypeScript error: Page type from Parameters<>)

decisions:
  - "Import drizzle operators from @cited/db (re-exported): direct drizzle-orm import in apps/web causes dual-instance TS errors because @cited/db resolves drizzle with @opentelemetry/api peer while apps/web doesn't"
  - "pnpm override drizzle-orm@0.36.4 in root package.json: ensures single version regardless of peer resolution"
  - "Google OAuth server action wrapped in void function for form.action: signInWithGoogle returns {error?} but form action prop requires (FormData) => void | Promise<void>"
  - "legal-gate.spec.ts Page type fix: Parameters<Parameters<typeof test>[1]>[0] fails TypeScript TestDetails constraint; use explicit Page import instead"

# Metrics
duration: ~30min
completed: 2026-05-09
---

# Phase 01 Plan 07: Supabase Auth Wiring Summary

**Supabase Auth (magic link + Google OAuth) wired into Next.js 16 App Router via @supabase/ssr; getSessionUser() stub replaced with real session + Drizzle profiles role lookup; PROF-02 settings server action live; Playwright E2E for magic-link round-trip**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-05-09
- **Tasks:** 5 / 5
- **Files created:** 11 new files
- **Files modified:** 7 existing files

## Supabase Auth Wiring Topology

```
Request → apps/web/middleware.ts
            └── updateSession() [lib/supabase/middleware.ts]
                    └── createServerClient (reads/writes httpOnly cookies)
                    └── supabase.auth.getUser() (forces session refresh)
                    └── returns NextResponse with updated cookies

/login  → LoginForm [useActionState]
            ├── signInWithMagicLink() → supabase.auth.signInWithOtp()
            │     └── email received → user clicks link → /auth/callback?code=...
            └── signInWithGoogle() → supabase.auth.signInWithOAuth()
                  └── redirect to Google → Google redirects → /auth/callback?code=...

/auth/callback  → exchangeCodeForSession(code) → session cookies set → redirect /dashboard
/auth/sign-out  → supabase.auth.signOut() → cookies cleared → redirect /

lib/auth/guards.ts:
  getSessionUser() → createServerSupabaseClient().auth.getUser()
                   → db.select(profiles.role).where(eq(profiles.id, user.id))
                   → { id, email, role }
  requireUser()    → getSessionUser() || redirect('/login')
  requireCurator() → requireUser() + role check || redirect('/dashboard')
```

## PROF-02 Settings Flow

```
/settings (Server Component)
  → requireUser() [auth gate]
  → db.select(profiles).where(eq(profiles.id, user.id))
  → <SettingsForm initial={row} />

SettingsForm [Client Component, useActionState]
  → updateProfile(formData) [Server Action]
      → requireUser() [auth + ownership]
      → Zod validate (display_name, timezone, privacy_mode)
      → db.update(profiles).set({...}).where(eq(profiles.id, user.id))
      → revalidatePath('/settings')
```

RLS enforces ownership at DB level — the `WHERE id = user.id` plus the `auth.uid() = id` RLS policy on profiles means a user can only update their own row.

## Production Google OAuth Setup (TODO)

Google OAuth is wired at the code level but requires production configuration:

1. **Supabase Dashboard:** Authentication → Providers → Google → Enable + add Client ID + Secret
2. **Google Cloud Console:** Create OAuth 2.0 credentials; set authorized redirect URI to `https://your-project.supabase.co/auth/v1/callback`
3. **Local dev:** GoTrue `GOTRUE_EXTERNAL_GOOGLE_ENABLED=false` (per 01-06 compose) — button shows but returns "provider not enabled" error locally
4. **Self-host:** Set `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true` + `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID` + `GOTRUE_EXTERNAL_GOOGLE_SECRET` in GoTrue config

## What Plan 01-08 Needs to Know

- Auth callbacks land on `/dashboard` (redirect target in all auth actions)
- AUTH-04 (disclaimer) and AUTH-05 (consent) MUST gate before `/dashboard` access
- 01-08 should add `/onboarding/legal-gate` route + redirect logic in the `(app)` layout that bounces users with `disclaimer_accepted_at IS NULL` or missing consent records to the gate BEFORE reaching dashboard content
- `getSessionUser()` returns the Supabase user + profile role — no session token is exposed to the browser
- The middleware (middleware.ts) runs on all non-static routes, keeping sessions fresh via httpOnly cookies
- Sign-out is POST-only (`/auth/sign-out`) to prevent CSRF — UI must use `<form method="POST">` or `fetch(..., {method: 'POST'})`

**Note:** Plan 01-08 (legal gate) was executed in parallel and has already implemented the legal gate flow. The `(app)/layout.tsx` and `(admin)/layout.tsx` already call `requireLegalGatePassed`.

## Task Commits

1. **Task 1: @supabase/ssr clients + middleware + auth callback + sign-out** — `2a4afee`
2. **Task 2: Real getSessionUser + Drizzle profiles role lookup** — `fcedd3f`
3. **Task 3: Login page form + magic-link + Google OAuth server actions** — `7f65a2d`
4. **Task 4: PROF-02 settings server action + form** — `da6be30`
5. **Task 5: Playwright E2E magic-link spec** — `748a5f2`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle-orm dual-instance TypeScript error**
- **Found during:** Task 2
- **Issue:** Importing `eq` directly from `drizzle-orm` in apps/web caused TypeScript error: two separate drizzle-orm instances resolve (one with `@opentelemetry/api` peer from `@cited/db`, one without from apps/web). Private property `shouldInlineParams` conflict between instances.
- **Fix:**
  - Re-exported common Drizzle operators from `packages/db/src/index.ts` (`eq, and, or, not, isNull, isNotNull, inArray, notInArray, lt, lte, gt, gte, ne, sql`)
  - Updated `guards.ts` and `legal-gate.ts` to import from `@cited/db` instead of `drizzle-orm` directly
  - Removed `drizzle-orm` direct dep from `apps/web/package.json`
  - Added `pnpm.overrides.drizzle-orm: "0.36.4"` to root `package.json`
- **Files modified:** packages/db/src/index.ts, apps/web/lib/auth/guards.ts, apps/web/lib/auth/legal-gate.ts, apps/web/package.json, package.json
- **Commit:** fcedd3f

**2. [Rule 1 - Bug] TypeScript error in lib/supabase/middleware.ts — CookieOptions vs ResponseCookie**
- **Found during:** Task 1
- **Issue:** `response.cookies.set(name, value, options)` type signature mismatch — `options` is `Partial<CookieSerializeOptions>` from the `cookie` package but `set` expects `Partial<ResponseCookie>` from `next/dist`
- **Fix:** Used object spread `response.cookies.set({ name, value, ...(options ?? {}) })` which works because both interfaces share overlapping cookie property names
- **Files modified:** apps/web/lib/supabase/middleware.ts
- **Commit:** 2a4afee

**3. [Rule 1 - Bug] TypeScript error in lib/supabase/server.ts + middleware.ts — implicit any for setAll callback**
- **Found during:** Task 1 (typecheck)
- **Issue:** `setAll: (toSet) => { ... }` with `noImplicitAny` — `toSet` needs explicit type
- **Fix:** Added explicit type `toSet: Array<{ name: string; value: string; options: CookieOptions }>` using the `CookieOptions` type imported from `@supabase/ssr`
- **Files modified:** apps/web/lib/supabase/server.ts, apps/web/lib/supabase/middleware.ts
- **Commit:** 2a4afee

**4. [Rule 1 - Bug] TypeScript error in login-form.tsx — Google OAuth form action type**
- **Found during:** Task 3 (typecheck)
- **Issue:** `signInWithGoogle()` returns `Promise<{error?: string}>` but HTML form `action` prop requires `(FormData) => void | Promise<void>`
- **Fix:** Added void-returning wrapper `handleGoogleSignIn(_formData: FormData): Promise<void>` that calls `signInWithGoogle()` and discards the return value
- **Files modified:** apps/web/app/(auth)/login/login-form.tsx
- **Commit:** 7f65a2d

**5. [Rule 1 - Bug] TypeScript error in e2e/legal-gate.spec.ts (from plan 01-08)**
- **Found during:** Task 3 (typecheck revealed pre-existing error)
- **Issue:** `Parameters<Parameters<typeof test>[1]>[0]` produces `TestDetails` type which doesn't satisfy `(...args: any) => any` constraint when used as a function parameter type. This was committed by the 01-08 parallel agent without fixing the type error.
- **Fix:** Added `type Page` import from `@playwright/test`; replaced the complex `Parameters<>` type with `Page` directly
- **Files modified:** apps/web/e2e/legal-gate.spec.ts
- **Commit:** 7f65a2d

## Known Stubs

None — all stubs from plans 01-05 have been replaced with real implementations.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| apps/web/lib/supabase/server.ts | FOUND |
| apps/web/lib/supabase/client.ts | FOUND |
| apps/web/lib/supabase/middleware.ts | FOUND |
| apps/web/middleware.ts | FOUND |
| apps/web/app/auth/callback/route.ts | FOUND |
| apps/web/app/auth/sign-out/route.ts | FOUND |
| apps/web/lib/auth/guards.ts (real implementation) | FOUND |
| apps/web/app/(auth)/login/actions.ts | FOUND |
| apps/web/app/(auth)/login/login-form.tsx | FOUND |
| apps/web/app/(app)/settings/actions.ts | FOUND |
| apps/web/app/(app)/settings/settings-form.tsx | FOUND |
| apps/web/e2e/auth.spec.ts | FOUND |
| pnpm --filter @cited/web typecheck → 0 | PASSED |
| pnpm --filter @cited/web build → 0 | PASSED |
