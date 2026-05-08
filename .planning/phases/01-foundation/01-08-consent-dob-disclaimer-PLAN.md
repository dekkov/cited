---
phase: 01-foundation
plan: 08
type: execute
wave: 3
depends_on: [01-04-database-schema-rls-PLAN.md, 01-05-nextjs-app-skeleton-PLAN.md, 01-07-supabase-auth-PLAN.md]
files_modified:
  - apps/web/app/(onboarding)/layout.tsx
  - apps/web/app/(onboarding)/legal-gate/page.tsx
  - apps/web/app/(onboarding)/legal-gate/legal-gate-form.tsx
  - apps/web/app/(onboarding)/legal-gate/actions.ts
  - apps/web/lib/auth/legal-gate.ts
  - apps/web/lib/auth/age.ts
  - apps/web/app/(app)/layout.tsx
  - apps/web/app/(admin)/layout.tsx
  - apps/web/components/disclaimer-banner.tsx
  - apps/web/lib/auth/age.test.ts
  - apps/web/e2e/legal-gate.spec.ts
autonomous: true
requirements: [AUTH-04, AUTH-05, AUTH-06, PROF-03]
must_haves:
  truths:
    - "After sign-in, a user with profiles.disclaimer_accepted_at IS NULL is redirected to /onboarding/legal-gate before /dashboard or /settings load"
    - "The legal-gate form requires DOB + jurisdiction (US / EU / other) and rejects submission if user is <13 (US) or <16 (EU)"
    - "The legal-gate form has THREE separate consent toggles (account / health-adjacent / AI free-text) per AUTH-05; each is independently togglable; account-creation consent is required to proceed"
    - "On submit, three rows are written to consent_records (one per scope) with timestamps + ipHash + userAgent; profiles.disclaimer_accepted_at, dob, dob_jurisdiction are set"
    - "Refusing the DOB gate shows a clear blocking message and signs the user out"
    - "PROF-03 schema plumbing is in place: profiles + consent_records can be JSON-exported (the export route handler stub exists; full UX lands in Phase 4)"
  artifacts:
    - path: "apps/web/lib/auth/age.ts"
      provides: "Pure age-gate function with US/EU/other jurisdictions"
      exports: ["isAgeAllowed", "AgeGateError"]
    - path: "apps/web/app/(onboarding)/legal-gate/page.tsx"
      provides: "Page with DOB + jurisdiction + 3 consent toggles + disclaimer ack"
      contains: "consent"
    - path: "apps/web/app/(onboarding)/legal-gate/actions.ts"
      provides: "Server action that validates age, writes consent_records ×3, sets profile fields"
      contains: "consent_records"
    - path: "apps/web/lib/auth/legal-gate.ts"
      provides: "requireLegalGatePassed() — used by (app) layout to bounce un-gated users"
      exports: ["isLegalGatePassed", "requireLegalGatePassed"]
    - path: "apps/web/app/api/account/export/route.ts"
      provides: "PROF-03 stub — JSON export of profile + consent_records (full UX in Phase 4)"
      contains: "profiles"
  key_links:
    - from: "apps/web/app/(app)/layout.tsx"
      to: "apps/web/lib/auth/legal-gate.ts"
      via: "requireLegalGatePassed() called after requireUser()"
      pattern: "requireLegalGatePassed"
    - from: "apps/web/app/(onboarding)/legal-gate/actions.ts"
      to: "packages/db/src/schema/consent-records.ts"
      via: "INSERT three rows (account, health_adjacent, ai_free_text)"
      pattern: "consent_records"
    - from: "apps/web/lib/auth/age.ts"
      to: "AUTH-06 enforcement"
      via: "isAgeAllowed(dob, jurisdiction) returns false for under-age"
      pattern: "isAgeAllowed"
---

<objective>
Close the Phase 1 auth flow with the Article 9 / disclaimer / DOB gate. After a user signs in (01-07), if they have not yet completed the legal gate, they are routed to `/onboarding/legal-gate` where they:
1. Provide DOB + jurisdiction (US / EU / other) — AUTH-06
2. Toggle three separate consent switches — account, health-adjacent processing, AI free-text analysis — AUTH-05
3. Acknowledge the medical disclaimer — AUTH-04

On submit, age is validated (≥13 US, ≥16 EU); consent_records ×3 are written; profile is updated. Until this completes, every (app) and (admin) route bounces back to the gate.

Also lands the PROF-03 export-route stub (full UX in Phase 4) so the schema plumbing is verified end-to-end at the JSON-export level.

Purpose: Phase 1 success criterion #2. Closes AUTH-04, AUTH-05, AUTH-06; lands PROF-03 plumbing. Mitigates Pitfall 2 (GDPR Art 9) and Pitfall 3 (disclaimer theater).
Output: A legally-defensible signup→gate→dashboard flow with separable Article 9 consent.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@/home/king/Hdiary/CLAUDE.md
@/home/king/Hdiary/.planning/REQUIREMENTS.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-04-SUMMARY.md
@/home/king/Hdiary/.planning/phases/01-foundation/01-07-SUMMARY.md
@/home/king/Hdiary/MEDICAL_REVIEW.md
@/home/king/Hdiary/docs/legal/privacy-policy.md

<interfaces>
<!-- Schema fields touched (from 01-04) -->
profiles: { id, disclaimer_accepted_at, dob, dob_jurisdiction, ... }
consent_records: { id, user_id, scope: 'account'|'health_adjacent'|'ai_free_text', granted, granted_at, user_agent, ip_hash }
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pure age-gate function + tests (AUTH-06)</name>
  <files>apps/web/lib/auth/age.ts, apps/web/lib/auth/age.test.ts</files>
  <read_first>/home/king/Hdiary/.planning/REQUIREMENTS.md (AUTH-06 line)</read_first>
  <behavior>
- Test: jurisdiction='us' + dob 12 years 364 days ago → false
- Test: jurisdiction='us' + dob exactly 13 years ago today → true
- Test: jurisdiction='eu' + dob 15 years 364 days ago → false
- Test: jurisdiction='eu' + dob exactly 16 years ago → true
- Test: jurisdiction='other' + dob exactly 13 years ago → true (default to ≥13 floor)
- Test: dob in the future → false
- Test: dob > 120 years ago → false (sanity)
- Test: leap-year DOB (Feb 29) handled — uses Mar 1 as the anniversary in non-leap years
  </behavior>
  <action>
1. `apps/web/lib/auth/age.ts`:
   ```ts
   export type Jurisdiction = 'us' | 'eu' | 'other';
   export class AgeGateError extends Error { constructor(public readonly reason: 'too_young'|'invalid_dob') { super(reason); } }

   const MIN_AGE: Record<Jurisdiction, number> = { us: 13, eu: 16, other: 13 };

   /** Returns true iff person born on `dob` (YYYY-MM-DD) is at least the jurisdiction-required age on `now`. */
   export function isAgeAllowed(dob: string, jurisdiction: Jurisdiction, now: Date = new Date()): boolean {
     const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
     if (!m) return false;
     const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
     if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
     const dobDate = new Date(Date.UTC(y, mo - 1, d));
     if (Number.isNaN(dobDate.getTime())) return false;
     if (dobDate.getTime() > now.getTime()) return false;
     // sanity: refuse > 120 years ago
     const maxBack = new Date(Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate()));
     if (dobDate.getTime() < maxBack.getTime()) return false;

     const minAge = MIN_AGE[jurisdiction];
     // age = floor((now - dob) in years) using anniversary-aware logic
     let age = now.getUTCFullYear() - y;
     const beforeBirthday =
       now.getUTCMonth() < mo - 1 ||
       (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d);
     if (beforeBirthday) age -= 1;
     return age >= minAge;
   }
   ```

2. `apps/web/lib/auth/age.test.ts` — implement all behaviors above using vitest. Use a fixed `now` for determinism.
  </action>
  <acceptance_criteria>
- `test -f apps/web/lib/auth/age.ts && grep -q "isAgeAllowed" apps/web/lib/auth/age.ts && grep -q "MIN_AGE" apps/web/lib/auth/age.ts`
- `grep -q "us: 13" apps/web/lib/auth/age.ts && grep -q "eu: 16" apps/web/lib/auth/age.ts`
- `pnpm --filter @cited/web test apps/web/lib/auth/age.test.ts` — all 8 behavior tests pass
  </acceptance_criteria>
  <done>Pure, tested age gate ready to wire into the legal-gate action.</done>
</task>

<task type="auto">
  <name>Task 2: legal-gate route group + page + form + server action (AUTH-04, AUTH-05, AUTH-06)</name>
  <files>apps/web/app/(onboarding)/layout.tsx, apps/web/app/(onboarding)/legal-gate/page.tsx, apps/web/app/(onboarding)/legal-gate/legal-gate-form.tsx, apps/web/app/(onboarding)/legal-gate/actions.ts, apps/web/lib/auth/legal-gate.ts</files>
  <read_first>apps/web/app/(app)/layout.tsx (from 01-05 / 01-07), apps/web/lib/auth/age.ts (Task 1), packages/db/src/schema/profiles.ts, packages/db/src/schema/consent-records.ts</read_first>
  <action>
1. `apps/web/lib/auth/legal-gate.ts`:
   ```ts
   import 'server-only';
   import { redirect } from 'next/navigation';
   import { createDb, profiles } from '@cited/db';
   import { eq } from 'drizzle-orm';
   import type { SessionUser } from './guards';

   export async function isLegalGatePassed(userId: string): Promise<boolean> {
     const db = createDb(process.env.DATABASE_URL!);
     const [row] = await db.select({ accepted: profiles.disclaimerAcceptedAt, dob: profiles.dob }).from(profiles).where(eq(profiles.id, userId)).limit(1);
     return Boolean(row?.accepted && row?.dob);
   }

   export async function requireLegalGatePassed(user: SessionUser): Promise<void> {
     if (!(await isLegalGatePassed(user.id))) redirect('/onboarding/legal-gate');
   }
   ```

2. Update `apps/web/app/(app)/layout.tsx` to call `requireLegalGatePassed`:
   ```tsx
   import { requireUser } from '@/lib/auth/guards';
   import { requireLegalGatePassed } from '@/lib/auth/legal-gate';
   import { DisclaimerBanner } from '@/components/disclaimer-banner';
   export default async function AppLayout({ children }: { children: React.ReactNode }) {
     const user = await requireUser();
     await requireLegalGatePassed(user);
     return (<div><DisclaimerBanner />{children}</div>);
   }
   ```
   Apply the same pattern to `apps/web/app/(admin)/layout.tsx`.

3. `apps/web/app/(onboarding)/layout.tsx` — bare layout for the gate (no app chrome, no curator gate). Calls `requireUser` so signed-out users go to /login. Does NOT call `requireLegalGatePassed` (that would loop).

4. `apps/web/app/(onboarding)/legal-gate/page.tsx`:
   ```tsx
   import { requireUser } from '@/lib/auth/guards';
   import { LegalGateForm } from './legal-gate-form';
   import { redirect } from 'next/navigation';
   import { isLegalGatePassed } from '@/lib/auth/legal-gate';
   export default async function LegalGatePage() {
     const user = await requireUser();
     if (await isLegalGatePassed(user.id)) redirect('/dashboard');
     return (
       <main className="mx-auto max-w-xl p-8">
         <h1 className="text-2xl font-semibold mb-2">Before we start</h1>
         <p className="text-sm text-muted-foreground mb-6">A few legal acknowledgments. Each consent below is independently togglable — see <a className="underline" href="/docs/legal/privacy-policy">our privacy policy</a> for what each one means.</p>
         <LegalGateForm />
       </main>
     );
   }
   ```

5. `apps/web/app/(onboarding)/legal-gate/legal-gate-form.tsx` (client):
   ```tsx
   'use client';
   import { useActionState } from 'react';
   import { submitLegalGate } from './actions';
   import { Button } from '@/components/ui/button';
   import { Input } from '@/components/ui/input';
   import { Label } from '@/components/ui/label';

   export function LegalGateForm() {
     const [state, action, pending] = useActionState(submitLegalGate, {} as { error?: string });
     return (
       <form action={action} className="space-y-6">
         <fieldset className="space-y-2">
           <legend className="font-medium">Date of birth + jurisdiction</legend>
           <Label htmlFor="dob">Date of birth</Label>
           <Input id="dob" name="dob" type="date" required />
           <Label htmlFor="dob_jurisdiction">I am subject to the laws of</Label>
           <select id="dob_jurisdiction" name="dob_jurisdiction" required className="w-full border rounded px-3 py-2">
             <option value="">Select…</option>
             <option value="us">United States</option>
             <option value="eu">European Union / EEA / UK</option>
             <option value="other">Other</option>
           </select>
           <p className="text-xs text-muted-foreground">Minimum age: 13 (US) / 16 (EU).</p>
         </fieldset>

         <fieldset className="space-y-3">
           <legend className="font-medium">Consent (Article 9 special-category data)</legend>
           <label className="flex items-start gap-3"><input type="checkbox" name="consent_account" required className="mt-1" /><span><strong>Account creation</strong> — required. We process your email and basic profile to provide the service.</span></label>
           <label className="flex items-start gap-3"><input type="checkbox" name="consent_health_adjacent" className="mt-1" /><span><strong>Health-adjacent data processing</strong> — habit check-ins, mood entries, sleep/nutrition/exercise inputs. Optional; you can use a reduced experience without this.</span></label>
           <label className="flex items-start gap-3"><input type="checkbox" name="consent_ai_free_text" className="mt-1" /><span><strong>AI/LLM analysis of your free-text answers</strong> — your free-text inputs are sent to OpenAI/Anthropic for analysis. Optional; the onboarding interview falls back to structured choices without this.</span></label>
           <p className="text-xs text-muted-foreground">You can change these at any time in Settings.</p>
         </fieldset>

         <fieldset>
           <label className="flex items-start gap-3"><input type="checkbox" name="disclaimer_ack" required className="mt-1" /><span><strong>I understand</strong> Cited is not medical advice. I will consult a qualified healthcare professional before changing health habits.</span></label>
         </fieldset>

         {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
         <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Continue'}</Button>
       </form>
     );
   }
   ```

6. `apps/web/app/(onboarding)/legal-gate/actions.ts`:
   ```ts
   'use server';
   import { z } from 'zod';
   import { createHash } from 'node:crypto';
   import { headers } from 'next/headers';
   import { redirect } from 'next/navigation';
   import { requireUser } from '@/lib/auth/guards';
   import { isAgeAllowed } from '@/lib/auth/age';
   import { createDb, profiles, consentRecords } from '@cited/db';
   import { eq } from 'drizzle-orm';

   const Schema = z.object({
     dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     dob_jurisdiction: z.enum(['us','eu','other']),
     consent_account: z.literal('on'),
     consent_health_adjacent: z.union([z.literal('on'), z.undefined()]).optional(),
     consent_ai_free_text: z.union([z.literal('on'), z.undefined()]).optional(),
     disclaimer_ack: z.literal('on'),
   });

   export async function submitLegalGate(_: unknown, formData: FormData) {
     const user = await requireUser();
     const parsed = Schema.safeParse(Object.fromEntries(formData.entries()));
     if (!parsed.success) return { error: 'Please complete all required fields, including the account-creation consent and disclaimer acknowledgment.' };

     if (!isAgeAllowed(parsed.data.dob, parsed.data.dob_jurisdiction)) {
       return { error: 'Per local law, you must be at least 13 (US) or 16 (EU) to use Cited.' };
     }

     const h = await headers();
     const ua = h.get('user-agent') ?? '';
     const ipRaw = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
     const ipHash = ipRaw ? createHash('sha256').update(ipRaw).digest('hex') : null;

     const db = createDb(process.env.DATABASE_URL!);
     const now = new Date();

     await db.transaction(async (tx) => {
       await tx.update(profiles).set({
         disclaimerAcceptedAt: now,
         dob: parsed.data.dob,
         dobJurisdiction: parsed.data.dob_jurisdiction,
         updatedAt: now,
       }).where(eq(profiles.id, user.id));

       const grants = [
         { scope: 'account' as const, granted: true },
         { scope: 'health_adjacent' as const, granted: parsed.data.consent_health_adjacent === 'on' },
         { scope: 'ai_free_text' as const, granted: parsed.data.consent_ai_free_text === 'on' },
       ];
       await tx.insert(consentRecords).values(grants.map(g => ({
         userId: user.id, scope: g.scope, granted: g.granted, grantedAt: now, userAgent: ua, ipHash: ipHash ?? undefined,
       })));
     });

     redirect('/dashboard');
   }
   ```

Note: `redirect` throws — no try/catch around it.

Also: the under-13/16 path returns an error message rather than signing the user out. Optional improvement (low cost): if the user explicitly clicks "I am under the minimum age" on a follow-up screen, sign them out. For Phase 1 the message is sufficient; document this as a Phase 4 polish item.
  </action>
  <acceptance_criteria>
- `test -f "apps/web/app/(onboarding)/legal-gate/page.tsx" && grep -q "consent" "apps/web/app/(onboarding)/legal-gate/page.tsx"`
- `grep -q "consent_account" "apps/web/app/(onboarding)/legal-gate/legal-gate-form.tsx"`
- `grep -q "consent_health_adjacent" "apps/web/app/(onboarding)/legal-gate/legal-gate-form.tsx"`
- `grep -q "consent_ai_free_text" "apps/web/app/(onboarding)/legal-gate/legal-gate-form.tsx"`
- `grep -q "disclaimer_ack" "apps/web/app/(onboarding)/legal-gate/legal-gate-form.tsx"`
- `test -f "apps/web/app/(onboarding)/legal-gate/actions.ts" && grep -q "isAgeAllowed" "apps/web/app/(onboarding)/legal-gate/actions.ts" && grep -q "consentRecords" "apps/web/app/(onboarding)/legal-gate/actions.ts" && grep -q "ip_hash\\|ipHash" "apps/web/app/(onboarding)/legal-gate/actions.ts"`
- Three INSERT scopes: `grep -c "scope:" "apps/web/app/(onboarding)/legal-gate/actions.ts"` ≥ 3
- `test -f apps/web/lib/auth/legal-gate.ts && grep -q "requireLegalGatePassed" apps/web/lib/auth/legal-gate.ts`
- `(app) layout calls requireLegalGatePassed`: `grep -q "requireLegalGatePassed" "apps/web/app/(app)/layout.tsx"`
- `(admin) layout calls requireLegalGatePassed`: `grep -q "requireLegalGatePassed" "apps/web/app/(admin)/layout.tsx"`
- `pnpm --filter @cited/web typecheck` exits 0
  </acceptance_criteria>
  <done>Legal gate route + form + action wired; (app) and (admin) layouts bounce un-gated users to it; three independent consent rows written on submit.</done>
</task>

<task type="auto">
  <name>Task 3: PROF-03 export route stub + Playwright E2E for the legal gate</name>
  <files>apps/web/app/api/account/export/route.ts, apps/web/e2e/legal-gate.spec.ts, apps/web/components/disclaimer-banner.tsx</files>
  <read_first>apps/web/lib/auth/guards.ts (after 01-07), packages/db/src/schema/profiles.ts, packages/db/src/schema/consent-records.ts</read_first>
  <action>
1. `apps/web/app/api/account/export/route.ts` (PROF-03 schema-plumbing stub; full UX in Phase 4):
   ```ts
   import { NextResponse } from 'next/server';
   import { requireUser } from '@/lib/auth/guards';
   import { createDb, profiles, consentRecords } from '@cited/db';
   import { eq } from 'drizzle-orm';

   export const runtime = 'nodejs';

   export async function GET() {
     const user = await requireUser();
     const db = createDb(process.env.DATABASE_URL!);
     const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
     const consents = await db.select().from(consentRecords).where(eq(consentRecords.userId, user.id));
     // Phase 1: profile + consent_records only. Phase 4 expands to habits, check-ins, streaks (PROF-03 full UX).
     const payload = {
       schema_version: '0.1.0-phase1',
       exported_at: new Date().toISOString(),
       profile,
       consent_records: consents,
       _note: 'Phase 1 export covers profile + consent only. Habits/check-ins/streaks land in Phase 4 (PROF-03).',
     };
     return new NextResponse(JSON.stringify(payload, null, 2), {
       headers: {
         'content-type': 'application/json',
         'content-disposition': `attachment; filename="cited-export-${user.id}-${Date.now()}.json"`,
       },
     });
   }
   ```

2. `apps/web/components/disclaimer-banner.tsx` — confirm it renders the LGL-01 string verbatim from MEDICAL_REVIEW.md / privacy-policy. (This file was created in 01-05; this plan doesn't need to change it, but verify in acceptance.)

3. `apps/web/e2e/legal-gate.spec.ts`:
   ```ts
   import { test, expect, request as pwRequest } from '@playwright/test';

   const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:9999';
   const SR = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
   const ANON = process.env.SUPABASE_ANON_KEY ?? '';

   test.skip(!SR || !ANON, 'Requires local Supabase stack');

   async function signInViaAdminLink(page: any, email: string) {
     const api = await pwRequest.newContext({ baseURL: SUPABASE_URL, extraHTTPHeaders: { apikey: SR, Authorization: `Bearer ${SR}` } });
     // create user
     await api.post('/admin/users', { data: { email, password: 'Password1!', email_confirm: true } });
     const link = await api.post('/admin/generate_link', { data: { type: 'magiclink', email, options: { redirect_to: 'http://localhost:3000/auth/callback?next=/dashboard' } } });
     const body = await link.json();
     await page.goto(body.action_link ?? body.properties?.action_link);
   }

   test('un-gated user is redirected from /dashboard to /onboarding/legal-gate', async ({ page }) => {
     const email = `gate-${Date.now()}@example.com`;
     await signInViaAdminLink(page, email);
     await expect(page).toHaveURL(/\/onboarding\/legal-gate$/);
   });

   test('under-13 (US) submission shows error', async ({ page }) => {
     const email = `young-${Date.now()}@example.com`;
     await signInViaAdminLink(page, email);
     await page.goto('/onboarding/legal-gate');
     // 10 years ago today — under 13
     const tenYearsAgo = new Date(); tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
     await page.locator('input[name="dob"]').fill(tenYearsAgo.toISOString().slice(0,10));
     await page.locator('select[name="dob_jurisdiction"]').selectOption('us');
     await page.locator('input[name="consent_account"]').check();
     await page.locator('input[name="disclaimer_ack"]').check();
     await page.getByRole('button', { name: /continue/i }).click();
     await expect(page.getByRole('alert')).toContainText(/at least 13/i);
   });

   test('valid submission writes consent ×3 and redirects to /dashboard', async ({ page }) => {
     const email = `gate-ok-${Date.now()}@example.com`;
     await signInViaAdminLink(page, email);
     await page.goto('/onboarding/legal-gate');
     const twentyYearsAgo = new Date(); twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
     await page.locator('input[name="dob"]').fill(twentyYearsAgo.toISOString().slice(0,10));
     await page.locator('select[name="dob_jurisdiction"]').selectOption('us');
     await page.locator('input[name="consent_account"]').check();
     await page.locator('input[name="consent_health_adjacent"]').check();
     // intentionally leave consent_ai_free_text UNCHECKED to verify granular separability
     await page.locator('input[name="disclaimer_ack"]').check();
     await page.getByRole('button', { name: /continue/i }).click();
     await expect(page).toHaveURL(/\/dashboard$/);

     // Export route confirms 3 consent rows with correct grants
     const exp = await page.request.get('/api/account/export');
     expect(exp.ok()).toBeTruthy();
     const body = await exp.json();
     expect(body.consent_records).toHaveLength(3);
     const byScope = Object.fromEntries(body.consent_records.map((r: any) => [r.scope, r.granted]));
     expect(byScope.account).toBe(true);
     expect(byScope.health_adjacent).toBe(true);
     expect(byScope.ai_free_text).toBe(false);
   });

   test('after gate passed, /dashboard loads (does not loop back)', async ({ page }) => {
     // Reuses the previous user via fresh email; just verify the (app) layout doesn't loop
     const email = `loop-${Date.now()}@example.com`;
     await signInViaAdminLink(page, email);
     await page.goto('/onboarding/legal-gate');
     const twenty = new Date(); twenty.setFullYear(twenty.getFullYear() - 20);
     await page.locator('input[name="dob"]').fill(twenty.toISOString().slice(0,10));
     await page.locator('select[name="dob_jurisdiction"]').selectOption('us');
     await page.locator('input[name="consent_account"]').check();
     await page.locator('input[name="disclaimer_ack"]').check();
     await page.getByRole('button', { name: /continue/i }).click();
     await page.goto('/dashboard');
     await expect(page).toHaveURL(/\/dashboard$/);
   });
   ```
  </action>
  <acceptance_criteria>
- `test -f apps/web/app/api/account/export/route.ts && grep -q "consent_records" apps/web/app/api/account/export/route.ts && grep -q "schema_version" apps/web/app/api/account/export/route.ts`
- `grep -q "requireUser" apps/web/app/api/account/export/route.ts`
- `test -f apps/web/e2e/legal-gate.spec.ts`
- All four E2E tests in legal-gate.spec.ts present: redirect, under-13, valid×3, no-loop
- `grep -q "consent_records).toHaveLength(3)" apps/web/e2e/legal-gate.spec.ts`
- `grep -q "byScope.ai_free_text).toBe(false)" apps/web/e2e/legal-gate.spec.ts` (proves granular separability)
- `pnpm --filter @cited/web typecheck` exits 0
- Tests SKIP cleanly without env vars; pass green in CI compose-smoke
  </acceptance_criteria>
  <done>Export route stub serves profile + consent_records as JSON. E2E proves: (1) un-gated users redirect, (2) age gate blocks under-13, (3) submission writes 3 consent rows with the user's specific grant pattern (separability), (4) gated users no longer loop.</done>
</task>

</tasks>

<verification>
1. `pnpm --filter @cited/web typecheck && pnpm --filter @cited/web build` exits 0
2. With local stack from 01-06 + 01-07: sign in as new user, automatically redirect to `/onboarding/legal-gate`
3. Submit DOB 12yo + US → error "at least 13"
4. Submit DOB 20yo + US + only `consent_account` + `disclaimer_ack` → redirect to /dashboard
5. `psql ... -c "select scope, granted from consent_records where user_id = '<id>'"` shows 3 rows: account=true, health_adjacent=false, ai_free_text=false
6. `psql ... -c "select disclaimer_accepted_at, dob, dob_jurisdiction from profiles where id = '<id>'"` populated
7. `curl -b "<session-cookie>" http://localhost:3000/api/account/export` → JSON with profile + 3 consent rows
8. Visit /dashboard again — no loop, loads normally
9. `pnpm --filter @cited/web test:e2e -- legal-gate.spec.ts` — all 4 tests pass green against compose stack
</verification>

<success_criteria>
- 4 requirements satisfied (AUTH-04, AUTH-05, AUTH-06, PROF-03 schema plumbing)
- Article 9 granular separable consent live (verified by E2E that users CAN check only some toggles)
- DOB gate enforces ≥13 US / ≥16 EU
- Disclaimer ack required, recorded in profiles.disclaimer_accepted_at
- Phase 1 success criteria #2 fully closed
- PROF-03 schema plumbing verified end-to-end via export route
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-08-SUMMARY.md` documenting:
- The legal-gate flow path: signup → callback → /dashboard (gated) → /onboarding/legal-gate → /dashboard
- Three consent_records rows shape and scopes
- Phase 4 PROF-03 work that remains: expand export to include habits/check-ins/streaks; add a settings re-consent UI; cascade-delete integration test
- Phase 4 PROF-04 work that remains: full integration test for cascade including pgvector embeddings (the schema is already cascade-correct from 01-04; the Phase 4 test exercises it under realistic data)
- Hand-off to Phase 2: AUTH-05(c) `ai_free_text` value must be checked before any LLM call passes free-text user input — packages/core/llm should add a `consent_check` helper in Phase 2 or 3
</output>
