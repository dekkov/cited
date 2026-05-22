/**
 * E2E tests for the Supabase Auth magic-link flow (AUTH-01, AUTH-02, AUTH-03).
 *
 * These tests require a local Supabase stack from 01-06 docker-compose with:
 *   GOTRUE_MAILER_AUTOCONFIRM=true (enables auto-confirm for magic links)
 *
 * They are skipped cleanly when required env vars are absent.
 *
 * Run with: pnpm --filter @cited/web test:e2e -- auth.spec.ts
 */
import { expect, request as pwRequest, test } from '@playwright/test';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://localhost:9999';
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? '';

const hasEnv = Boolean(SUPABASE_SERVICE_ROLE_KEY && SUPABASE_ANON_KEY);

test.describe('Auth flow', () => {
  test.skip(
    !hasEnv,
    'Requires local Supabase stack (SUPABASE_SERVICE_ROLE_KEY + SUPABASE_ANON_KEY)',
  );

  test('magic-link sign-in round-trip', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    // 1. Visit /login, submit email
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /send magic link/i }).click();
    await expect(page.getByText(/magic link sent/i)).toBeVisible();

    // 2. Use service role to fetch the otp link from GoTrue admin generate_link API
    const api = await pwRequest.newContext({
      baseURL: SUPABASE_URL,
      extraHTTPHeaders: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    const link = await api.post('/admin/generate_link', {
      data: {
        type: 'magiclink',
        email,
        options: {
          redirect_to: 'http://localhost:3000/auth/callback?next=/dashboard',
        },
      },
    });
    expect(link.ok()).toBeTruthy();
    const body = (await link.json()) as {
      action_link?: string;
      properties?: { action_link?: string };
    };
    const actionLink = body.action_link ?? body.properties?.action_link ?? '';
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
});
