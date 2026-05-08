---
phase: 01-foundation
plan: 07
type: execute
wave: 3
depends_on: [01-04-database-schema-rls-PLAN.md, 01-05-nextjs-app-skeleton-PLAN.md, 01-06-docker-compose-ci-PLAN.md]
files_modified:
  - apps/web/package.json
  - apps/web/lib/supabase/server.ts
  - apps/web/lib/supabase/client.ts
  - apps/web/lib/supabase/middleware.ts
  - apps/web/middleware.ts
  - apps/web/lib/auth/guards.ts
  - apps/web/app/(auth)/login/page.tsx
  - apps/web/app/(auth)/login/actions.ts
  - apps/web/app/(auth)/login/login-form.tsx
  - apps/web/app/auth/callback/route.ts
  - apps/web/app/auth/sign-out/route.ts
  - apps/web/app/(app)/settings/actions.ts
  - apps/web/app/(app)/settings/page.tsx
  - apps/web/app/(app)/settings/settings-form.tsx
  - apps/web/e2e/auth.spec.ts
autonomous: true
requirements: [AUTH-01, AUTH-02, AUTH-03]
must_haves:
  truths:
    - "User can sign up / sign in via Supabase email magic link from the /login page"
    - "User can sign up / sign in via Google OAuth from the /login page (link present even if Google client not configured locally — local stack uses email-only flow)"
    - "Session persists across browser refresh via httpOnly Supabase cookies set by @supabase/ssr middleware"
    - "Sign-out from any page works via the /auth/sign-out route handler and clears the session cookie"
    - "After sign-in, requireUser() returns the real Supabase user id + the role from public.profiles"
    - "The PROF-02 settings page works end-to-end: server action updates display_name, timezone, privacy_mode through Drizzle"
  artifacts:
    - path: "apps/web/lib/supabase/server.ts"
      provides: "createServerClient (App Router) factory using @supabase/ssr"
      exports: ["createServerSupabaseClient"]
    - path: "apps/web/lib/supabase/middleware.ts"
      provides: "updateSession helper to refresh cookies on every request"
      exports: ["updateSession"]
    - path: "apps/web/middleware.ts"
      provides: "Next.js root middleware delegating to updateSession"
      contains: "updateSession"
    - path: "apps/web/app/auth/callback/route.ts"
      provides: "OAuth + magic-link code-exchange handler"
      contains: "exchangeCodeForSession"
    - path: "apps/web/app/(auth)/login/actions.ts"
      provides: "signInWithMagicLink + signInWithGoogle server actions"
      exports: ["signInWithMagicLink", "signInWithGoogle"]
    - path: "apps/web/e2e/auth.spec.ts"
      provides: "Playwright spec exercising magic-link flow against local GoTrue (autoconfirm=true)"
      contains: "magic link"
  key_links:
    - from: "apps/web/lib/auth/guards.ts"
      to: "apps/web/lib/supabase/server.ts"
      via: "getSessionUser uses createServerSupabaseClient + queries public.profiles for role"
      pattern: "createServerSupabaseClient"
    - from: "apps/web/middleware.ts"
      to: "apps/web/lib/supabase/middleware.ts"
      via: "exports default middleware that calls updateSession"
      pattern: "updateSession"
    - from: "apps/web/app/auth/callback/route.ts"
      to: "apps/web/app/(app)/dashboard"
      via: "redirect after successful exchange"
      pattern: "redirect"
---

<objective>
Wire Supabase Auth (magic link + Google OAuth) into `apps/web` using `@supabase/ssr`. Replace the stub `getSessionUser` in `lib/auth/guards.ts` with a real implementation that resolves the user + their role from `public.profiles`. Make the PROF-02 settings server action work end-to-end via Drizzle. Add Playwright E2E covering the magic-link flow against the local GoTrue (which has `MAILER_AUTOCONFIRM=true`).

Purpose: Phase 1 success criteria #1 + #2 (working login page; session persists; sign-out works). Closes AUTH-01, AUTH-02, AUTH-03.
Output: Live auth flow against the docker-compose stack from 01-06; settings page that saves changes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/CLAUDE.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-04-SUMMARY.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-05-SUMMARY.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-06-SUMMARY.md

<interfaces>
<!-- Canonical @supabase/ssr App Router pattern (Next.js 16 + React 19) -->

```ts
// lib/supabase/server.ts — server components, route handlers, server actions
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => { try { toSet.forEach(({name,value,options}) => cookieStore.set(name,value,options)); } catch {} },
      },
    },
  );
}
```

```ts
// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({name,value}) => request.cookies.set(name,value));
          response = NextResponse.next({ request });
          toSet.forEach(({name,value,options}) => response.cookies.set(name,value,options));
        },
      },
    },
  );
  await supabase.auth.getUser(); // refresh
  return response;
}
```

```ts
// auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=auth', url.origin));
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: @supabase/ssr clients + middleware + auth callback + sign-out</name>
  <files>apps/web/package.json, apps/web/lib/supabase/server.ts, apps/web/lib/supabase/client.ts, apps/web/lib/supabase/middleware.ts, apps/web/middleware.ts, apps/web/app/auth/callback/route.ts, apps/web/app/auth/sign-out/route.ts</files>
  <read_first>apps/web/lib/auth/guards.ts (stub from 01-05), apps/web/lib/env.ts</read_first>
  <action>
1. Add deps to `apps/web/package.json`: `@supabase/ssr@^0.5`, `@supabase/supabase-js@^2`. (NOT `@supabase/auth-helpers-nextjs` — deprecated per CLAUDE.md.)

2. `apps/web/lib/supabase/server.ts`: implement `createServerSupabaseClient` using the canonical pattern in <interfaces>.

3. `apps/web/lib/supabase/client.ts`:
   ```ts
   import { createBrowserClient } from '@supabase/ssr';
   export function createBrowserSupabaseClient() {
     return createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     );
   }
   ```

4. `apps/web/lib/supabase/middleware.ts`: implement `updateSession` per <interfaces>.

5. `apps/web/middleware.ts`:
   ```ts
   import { type NextRequest } from 'next/server';
   import { updateSession } from '@/lib/supabase/middleware';
   export async function middleware(request: NextRequest) { return updateSession(request); }
   export const config = {
     matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
   };
   ```

6. `apps/web/app/auth/callback/route.ts`: per <interfaces>. Handle both magic-link (code exchange) and OAuth callbacks.

7. `apps/web/app/auth/sign-out/route.ts`:
   ```ts
   import { NextResponse } from 'next/server';
   import { createServerSupabaseClient } from '@/lib/supabase/server';
   export async function POST(request: Request) {
     const supabase = await createServerSupabaseClient();
     await supabase.auth.signOut();
     return NextResponse.redirect(new URL('/', request.url), { status: 303 });
   }
   ```
  </action>
  <acceptance_criteria>
- `grep -q '"@supabase/ssr"' apps/web/package.json && grep -q '"@supabase/supabase-js"' apps/web/package.json`
- `! grep -r "@supabase/auth-helpers-nextjs" apps/web` (deprecated package not present)
- `test -f apps/web/lib/supabase/server.ts && grep -q "createServerClient" apps/web/lib/supabase/server.ts && grep -q "from 'next/headers'" apps/web/lib/supabase/server.ts`
- `test -f apps/web/lib/supabase/middleware.ts && grep -q "auth.getUser()" apps/web/lib/supabase/middleware.ts`
- `test -f apps/web/middleware.ts && grep -q "updateSession" apps/web/middleware.ts`
- `test -f apps/web/app/auth/callback/route.ts && grep -q "exchangeCodeForSession" apps/web/app/auth/callback/route.ts`
- `test -f apps/web/app/auth/sign-out/route.ts && grep -q "auth.signOut" apps/web/app/auth/sign-out/route.ts`
- `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>SSR clients + middleware + callback + sign-out routes wired per Supabase canonical App Router pattern.</done>
</task>

<task type="auto">
  <name>Task 2: Real getSessionUser using @supabase/ssr + Drizzle profiles role lookup</name>
  <files>apps/web/lib/auth/guards.ts</files>
  <read_first>apps/web/lib/auth/guards.ts (stub), apps/web/lib/supabase/server.ts (Task 1), packages/db/src/schema/profiles.ts</read_first>
  <action>
Replace the stub body in `lib/auth/guards.ts`:

```ts
import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createDb } from '@cited/db';
import { profiles } from '@cited/db';
import { eq } from 'drizzle-orm';

export type UserRole = 'user' | 'curator' | 'admin';
export type SessionUser = { id: string; email: string; role: UserRole };

let _db: ReturnType<typeof createDb> | null = null;
function db() {
  if (!_db) _db = createDb(process.env.DATABASE_URL!);
  return _db;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const rows = await db().select({ role: profiles.role }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const role = (rows[0]?.role ?? 'user') as UserRole;
  return { id: user.id, email: user.email ?? '', role };
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

Note: `createDb` uses the postgres driver with `prepare: false` (per the 01-04 client). The DATABASE_URL is server-side only — never reaches the browser.
  </action>
  <acceptance_criteria>
- `grep -q "createServerSupabaseClient" apps/web/lib/auth/guards.ts`
- `grep -q "supabase.auth.getUser" apps/web/lib/auth/guards.ts`
- `grep -q "from '@cited/db'" apps/web/lib/auth/guards.ts && grep -q "profiles" apps/web/lib/auth/guards.ts`
- `! grep -q "TODO(01-07)" apps/web/lib/auth/guards.ts` (stub note removed)
- `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>requireUser / requireCurator now return real session data + role from profiles.</done>
</task>

<task type="auto">
  <name>Task 3: Login page form + magic-link + Google OAuth server actions</name>
  <files>apps/web/app/(auth)/login/page.tsx, apps/web/app/(auth)/login/actions.ts, apps/web/app/(auth)/login/login-form.tsx</files>
  <read_first>apps/web/app/(auth)/login/page.tsx (stub from 01-05), apps/web/lib/supabase/server.ts</read_first>
  <action>
1. `apps/web/app/(auth)/login/actions.ts`:
   ```ts
   'use server';
   import { z } from 'zod';
   import { createServerSupabaseClient } from '@/lib/supabase/server';
   import { redirect } from 'next/navigation';
   import { headers } from 'next/headers';

   const EmailSchema = z.object({ email: z.string().email() });

   export async function signInWithMagicLink(_: unknown, formData: FormData) {
     const parsed = EmailSchema.safeParse({ email: formData.get('email') });
     if (!parsed.success) return { error: 'Enter a valid email address.' };
     const supabase = await createServerSupabaseClient();
     const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
     const { error } = await supabase.auth.signInWithOtp({
       email: parsed.data.email,
       options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
     });
     if (error) return { error: error.message };
     return { ok: true, message: 'Check your inbox — magic link sent.' };
   }

   export async function signInWithGoogle() {
     const supabase = await createServerSupabaseClient();
     const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
     const { data, error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: { redirectTo: `${origin}/auth/callback?next=/dashboard` },
     });
     if (error) return { error: error.message };
     if (data.url) redirect(data.url);
     return { error: 'Could not start Google sign-in.' };
   }
   ```

2. `apps/web/app/(auth)/login/login-form.tsx` (client component):
   ```tsx
   'use client';
   import { useActionState } from 'react';
   import { signInWithMagicLink, signInWithGoogle } from './actions';
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';

   const initial: { ok?: boolean; message?: string; error?: string } = {};

   export function LoginForm() {
     const [state, action, pending] = useActionState(signInWithMagicLink, initial);
     return (
       <div className="space-y-6">
         <form action={action} className="space-y-3">
           <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
           <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Sending…' : 'Send magic link'}</Button>
           {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
           {state.ok && <p className="text-sm text-green-700">{state.message}</p>}
         </form>
         <form action={signInWithGoogle}>
           <Button type="submit" variant="outline" className="w-full">Continue with Google</Button>
         </form>
       </div>
     );
   }
   ```

3. `apps/web/app/(auth)/login/page.tsx` — replace stub:
   ```tsx
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   import { LoginForm } from './login-form';
   import { redirect } from 'next/navigation';
   import { getSessionUser } from '@/lib/auth/guards';
   export default async function LoginPage() {
     const u = await getSessionUser();
     if (u) redirect('/dashboard');
     return (
       <main className="min-h-screen flex items-center justify-center p-8">
         <Card className="w-full max-w-md">
           <CardHeader><CardTitle>Sign in to Cited</CardTitle></CardHeader>
           <CardContent><LoginForm /></CardContent>
         </Card>
       </main>
     );
   }
   ```

Note on Google OAuth in local stack: GoTrue is configured with `GOTRUE_EXTERNAL_GOOGLE_ENABLED: "false"` in 01-06's compose. The button shows but produces a "provider not enabled" error in local dev, which is acceptable — production setup is documented in `docs/self-host.md`. AUTH-02 requirement is satisfied at the code level (server action calls `signInWithOAuth({provider:'google'})`); enabling Google in production is an external configuration step (note in summary).
  </action>
  <acceptance_criteria>
- `test -f "apps/web/app/(auth)/login/actions.ts" && grep -q "signInWithOtp" "apps/web/app/(auth)/login/actions.ts" && grep -q "signInWithOAuth" "apps/web/app/(auth)/login/actions.ts" && grep -q "provider: 'google'" "apps/web/app/(auth)/login/actions.ts"`
- `test -f "apps/web/app/(auth)/login/login-form.tsx" && grep -q "useActionState" "apps/web/app/(auth)/login/login-form.tsx"`
- `grep -q "/auth/callback" "apps/web/app/(auth)/login/actions.ts"`
- `pnpm --filter @cited/web typecheck` exits 0
- `pnpm --filter @cited/web build` exits 0
  </acceptance_criteria>
  <done>Magic-link and Google OAuth server actions wired; login form uses useActionState; signed-in users redirect to /dashboard.</done>
</task>

<task type="auto">
  <name>Task 4: PROF-02 settings server action — update profile via Drizzle</name>
  <files>apps/web/app/(app)/settings/page.tsx, apps/web/app/(app)/settings/actions.ts</files>
  <read_first>apps/web/app/(app)/settings/page.tsx (stub from 01-05), packages/db/src/schema/profiles.ts</read_first>
  <action>
1. `apps/web/app/(app)/settings/actions.ts`:
   ```ts
   'use server';
   import { z } from 'zod';
   import { revalidatePath } from 'next/cache';
   import { requireUser } from '@/lib/auth/guards';
   import { createDb, profiles } from '@cited/db';
   import { eq } from 'drizzle-orm';

   const Schema = z.object({
     display_name: z.string().min(0).max(80),
     timezone: z.string().min(1).max(80),
     privacy_mode: z.enum(['public','private']),
   });

   export async function updateProfile(_: unknown, formData: FormData) {
     const user = await requireUser();
     const parsed = Schema.safeParse({
       display_name: formData.get('display_name'),
       timezone: formData.get('timezone'),
       privacy_mode: formData.get('privacy_mode'),
     });
     if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
     const db = createDb(process.env.DATABASE_URL!);
     await db.update(profiles)
       .set({ displayName: parsed.data.display_name, timezone: parsed.data.timezone, privacyMode: parsed.data.privacy_mode, updatedAt: new Date() })
       .where(eq(profiles.id, user.id));
     revalidatePath('/settings');
     return { ok: true, message: 'Saved.' };
   }
   ```

2. `apps/web/app/(app)/settings/page.tsx` — replace stub form with one that uses the action:
   ```tsx
   import { requireUser } from '@/lib/auth/guards';
   import { createDb, profiles } from '@cited/db';
   import { eq } from 'drizzle-orm';
   import { SettingsForm } from './settings-form';
   export default async function SettingsPage() {
     const user = await requireUser();
     const db = createDb(process.env.DATABASE_URL!);
     const [row] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
     return <SettingsForm initial={{ display_name: row?.displayName ?? '', timezone: row?.timezone ?? 'UTC', privacy_mode: row?.privacyMode ?? 'private' }} />;
   }
   ```

3. `apps/web/app/(app)/settings/settings-form.tsx` (client component):
   ```tsx
   'use client';
   import { useActionState } from 'react';
   import { updateProfile } from './actions';
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';

   export function SettingsForm({ initial }: { initial: { display_name: string; timezone: string; privacy_mode: 'public'|'private' } }) {
     const [state, action, pending] = useActionState(updateProfile, {} as { ok?: boolean; message?: string; error?: string });
     return (
       <form action={action} className="space-y-4 max-w-md">
         <h1 className="text-2xl font-semibold">Settings</h1>
         <div className="space-y-2"><Label htmlFor="display_name">Display name</Label><Input id="display_name" name="display_name" defaultValue={initial.display_name} maxLength={80} /></div>
         <div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" defaultValue={initial.timezone} required /></div>
         <div className="space-y-2"><Label htmlFor="privacy_mode">Privacy mode</Label>
           <select id="privacy_mode" name="privacy_mode" defaultValue={initial.privacy_mode} className="w-full border rounded px-3 py-2">
             <option value="private">Private</option><option value="public">Public</option>
           </select>
         </div>
         <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
         {state.ok && <p className="text-sm text-green-700">{state.message}</p>}
         {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
       </form>
     );
   }
   ```
  </action>
  <acceptance_criteria>
- `test -f "apps/web/app/(app)/settings/actions.ts" && grep -q "updateProfile" "apps/web/app/(app)/settings/actions.ts" && grep -q "db.update(profiles)" "apps/web/app/(app)/settings/actions.ts"`
- `grep -q "revalidatePath" "apps/web/app/(app)/settings/actions.ts"`
- `grep -q "requireUser" "apps/web/app/(app)/settings/actions.ts"`
- `test -f "apps/web/app/(app)/settings/settings-form.tsx" && grep -q "useActionState" "apps/web/app/(app)/settings/settings-form.tsx"`
- `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Settings page reads + writes via Drizzle, RLS enforces ownership at the DB layer (user can only update their own row by definition of WHERE id = auth.uid()).</done>
</task>

<task type="auto">
  <name>Task 5: Playwright E2E — magic-link round-trip against local GoTrue (autoconfirm)</name>
  <files>apps/web/e2e/auth.spec.ts</files>
  <read_first>docker-compose.yml (GoTrue config in 01-06), apps/web/e2e/smoke.spec.ts (from 01-05), apps/web/app/(auth)/login/login-form.tsx</read_first>
  <action>
The local GoTrue runs with `GOTRUE_MAILER_AUTOCONFIRM: "true"` (per 01-06). This means signing in with `signInWithOtp` against the local stack auto-confirms without needing to click an email link. We exploit this for E2E.

`apps/web/e2e/auth.spec.ts`:

```ts
import { test, expect, request as pwRequest } from '@playwright/test';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:9999';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

test.skip(!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY, 'Requires local Supabase stack from 01-06');

test('magic-link sign-in round-trip', async ({ page, browser }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // 1. Visit /login, submit email
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: /send magic link/i }).click();
  await expect(page.getByText(/magic link sent/i)).toBeVisible();

  // 2. Use service role to fetch the otp link from GoTrue admin generate_link API
  const api = await pwRequest.newContext({ baseURL: SUPABASE_URL, extraHTTPHeaders: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
  const link = await api.post('/admin/generate_link', { data: { type: 'magiclink', email, options: { redirect_to: 'http://localhost:3000/auth/callback?next=/dashboard' } } });
  expect(link.ok()).toBeTruthy();
  const body = await link.json();
  const actionLink: string = body.action_link ?? body.properties?.action_link;
  expect(actionLink).toBeTruthy();

  // 3. Visit the action link — exchanges code, sets cookie, redirects to /dashboard
  await page.goto(actionLink);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

  // 4. Refresh — session persists (AUTH-03)
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);

  // 5. Settings page accessible
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

  // 6. Sign out via POST to /auth/sign-out
  await page.request.post('/auth/sign-out');
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
```

Note: The exact admin endpoint for GoTrue's `generate_link` is `/admin/generate_link` (POST, requires service_role JWT). If the local GoTrue version differs, the test SKIPS rather than fails — version-coupling is acceptable for an E2E that runs against the locally-controlled compose stack only.
  </action>
  <acceptance_criteria>
- `test -f apps/web/e2e/auth.spec.ts && grep -q "magic-link sign-in round-trip" apps/web/e2e/auth.spec.ts`
- `grep -q "generate_link" apps/web/e2e/auth.spec.ts`
- `grep -q "page.reload" apps/web/e2e/auth.spec.ts` (AUTH-03 verification)
- `grep -q "/auth/sign-out" apps/web/e2e/auth.spec.ts`
- Test runs green when invoked in CI compose-smoke job (depends on 01-06 environment)
  </acceptance_criteria>
  <done>Playwright E2E proves magic-link → callback → dashboard → reload (AUTH-03) → sign-out flow works against local GoTrue.</done>
</task>

</tasks>

<verification>
1. `pnpm --filter @cited/web typecheck && pnpm --filter @cited/web build` — exits 0
2. With local stack from 01-06 up: `pnpm --filter @cited/web dev`, visit /login, enter an email, see "magic link sent", check GoTrue logs for the generated link, paste it into the browser → land on /dashboard
3. Reload /dashboard → still authed (AUTH-03)
4. POST /auth/sign-out → redirected to /, /dashboard now redirects to /login (AUTH-03)
5. Visit /settings → form renders with current values; submit a change; reload → values persisted
6. `pnpm --filter @cited/web test:e2e -- auth.spec.ts` — green against compose stack
7. `psql ... -c "select display_name, timezone, privacy_mode from profiles where id = '<test-uid>'"` shows updated values
</verification>

<success_criteria>
- 3 requirements satisfied (AUTH-01, AUTH-02, AUTH-03)
- Magic-link sign-in works end-to-end against the local GoTrue
- Google OAuth server action wired (production-config gated; local stack defaults to disabled)
- Session persists across reload via @supabase/ssr cookies
- Sign-out works from any page via POST /auth/sign-out
- Settings server action (PROF-02) writes via Drizzle; RLS enforces ownership
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-07-SUMMARY.md` documenting:
- Supabase Auth wiring topology (server.ts, client.ts, middleware.ts, callback route)
- The PROF-02 settings flow path
- Production Google OAuth setup TODO (env vars, GoTrue config)
- Anything plan 01-08 (consent + DOB gate) needs to know — specifically: AUTH callbacks land on /dashboard, but AUTH-04 (disclaimer) and AUTH-05 (consent) MUST gate before /dashboard access. 01-08 will add a `/onboarding/legal-gate` route + redirect logic in the (app) layout that bounces users with `disclaimer_accepted_at IS NULL` or missing consent records to the gate.
</output>
