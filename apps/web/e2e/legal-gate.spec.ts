/**
 * E2E tests for the legal gate flow (AUTH-04, AUTH-05, AUTH-06).
 *
 * These tests require a local Supabase stack (from 01-06 docker-compose).
 * They are skipped cleanly when env vars are absent.
 *
 * Run with: pnpm --filter @cited/web test:e2e -- legal-gate.spec.ts
 */
import { type Page, test, expect, request as pwRequest } from '@playwright/test';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://localhost:9999';
const SR = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const ANON = process.env['SUPABASE_ANON_KEY'] ?? '';

const hasEnv = Boolean(SR && ANON);

async function signInViaAdminLink(page: Page, email: string): Promise<void> {
  const api = await pwRequest.newContext({
    baseURL: SUPABASE_URL,
    extraHTTPHeaders: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
    },
  });

  // Create user with confirmed email
  await api.post('/admin/users', {
    data: { email, password: 'Password1!', email_confirm: true },
  });

  // Generate magic link
  const linkRes = await api.post('/admin/generate_link', {
    data: {
      type: 'magiclink',
      email,
      options: {
        redirect_to: 'http://localhost:3000/auth/callback?next=/dashboard',
      },
    },
  });
  const body = (await linkRes.json()) as {
    action_link?: string;
    properties?: { action_link?: string };
  };
  const actionLink = body.action_link ?? body.properties?.action_link ?? '';
  await page.goto(actionLink);
}

test.describe('Legal gate flow', () => {
  if (!hasEnv) {
    test('skip: requires SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY', () => {
      test.skip(true, 'Requires local Supabase stack');
    });
  } else {
    test('un-gated user is redirected from /dashboard to /onboarding/legal-gate', async ({
      page,
    }) => {
      const email = `gate-${Date.now()}@example.com`;
      await signInViaAdminLink(page, email);
      await expect(page).toHaveURL(/\/onboarding\/legal-gate$/);
    });

    test('under-13 (US) submission shows error', async ({ page }) => {
      const email = `young-${Date.now()}@example.com`;
      await signInViaAdminLink(page, email);
      await page.goto('/onboarding/legal-gate');

      // 10 years ago today — under 13
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      await page.locator('input[name="dob"]').fill(tenYearsAgo.toISOString().slice(0, 10));
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

      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
      await page.locator('input[name="dob"]').fill(twentyYearsAgo.toISOString().slice(0, 10));
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
      const body = (await exp.json()) as {
        consent_records: Array<{ scope: string; granted: boolean }>;
      };
      expect(body.consent_records).toHaveLength(3);
      const byScope = Object.fromEntries(
        body.consent_records.map((r) => [r.scope, r.granted] as const),
      );
      expect(byScope['account']).toBe(true);
      expect(byScope['health_adjacent']).toBe(true);
      expect(byScope['ai_free_text']).toBe(false);
    });

    test('after gate passed, /dashboard loads (does not loop back)', async ({ page }) => {
      const email = `loop-${Date.now()}@example.com`;
      await signInViaAdminLink(page, email);
      await page.goto('/onboarding/legal-gate');

      const twenty = new Date();
      twenty.setFullYear(twenty.getFullYear() - 20);
      await page.locator('input[name="dob"]').fill(twenty.toISOString().slice(0, 10));
      await page.locator('select[name="dob_jurisdiction"]').selectOption('us');
      await page.locator('input[name="consent_account"]').check();
      await page.locator('input[name="disclaimer_ack"]').check();
      await page.getByRole('button', { name: /continue/i }).click();

      // Navigate directly to dashboard — should load without redirecting back to gate
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard$/);
    });
  }
});
